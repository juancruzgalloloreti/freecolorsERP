import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, PurchaseOrderStatus, StockMovementType } from '@erp/db'
import { PrismaService } from '../common/prisma.service'

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, params?: { supplierId?: string; status?: string }) {
    return this.prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        ...(params?.supplierId && { supplierId: params.supplierId }),
        ...(params?.status && { status: params.status as any }),
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        orderDate: 'desc',
      },
    })
  }

  async findById(id: string, tenantId: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
        receptions: {
          include: {
            items: {
              include: {
                purchaseOrderItem: {
                  include: {
                    product: true,
                  },
                },
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })
    if (!order) {
      throw new NotFoundException('Purchase order not found')
    }
    return order
  }

  async create(tenantId: string, data: {
    supplierId: string
    expectedDate?: string
    notes?: string
    items: Array<{
      productId: string
      quantity: number
      unitPrice: number
      discountPercent?: number
      taxRate?: number
    }>
  }, userId?: string) {
    if (!data.supplierId) throw new BadRequestException('La orden de compra requiere proveedor')
    if (!data.items?.length) throw new BadRequestException('La orden de compra requiere al menos un producto')

    let subtotal = 0
    let taxAmount = 0

    const itemsData = data.items.map((item) => {
      if (!item.productId) throw new BadRequestException('Todos los items requieren producto')
      if (Number(item.quantity) <= 0) throw new BadRequestException('La cantidad debe ser mayor a cero')
      if (Number(item.unitPrice) < 0) throw new BadRequestException('El precio no puede ser negativo')
      const itemSubtotal = item.quantity * item.unitPrice * (1 - (item.discountPercent || 0) / 100)
      const itemTax = itemSubtotal * ((item.taxRate || 21) / 100)
      const itemTotal = itemSubtotal + itemTax

      subtotal += itemSubtotal
      taxAmount += itemTax

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent || 0,
        subtotal: itemSubtotal,
        taxRate: item.taxRate || 21,
        taxAmount: itemTax,
        total: itemTotal,
      }
    })

    const total = subtotal + taxAmount

    return this.prisma.$transaction(async (tx) => {
      const lastOrder = await tx.purchaseOrder.findFirst({
        where: { tenantId },
        orderBy: { number: 'desc' },
        select: { number: true },
      })
      const nextNumber = (lastOrder?.number ?? 0) + 1

      return tx.purchaseOrder.create({
        data: {
          tenantId,
          supplierId: data.supplierId,
          number: nextNumber,
          status: PurchaseOrderStatus.PENDING,
          expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
          notes: data.notes,
          subtotal: this.roundMoney(subtotal),
          taxAmount: this.roundMoney(taxAmount),
          total: this.roundMoney(total),
          createdById: userId,
          items: {
            create: itemsData.map((item) => ({
              ...item,
              subtotal: this.roundMoney(item.subtotal),
              taxAmount: this.roundMoney(item.taxAmount),
              total: this.roundMoney(item.total),
            })),
          },
        },
        include: {
          supplier: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      })
    })
  }

  async update(id: string, tenantId: string, data: {
    expectedDate?: string
    notes?: string
    status?: PurchaseOrderStatus
  }) {
    await this.findById(id, tenantId)

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...(data.expectedDate && { expectedDate: new Date(data.expectedDate) }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.status && { status: data.status }),
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    })
  }

  async cancel(id: string, tenantId: string) {
    const order = await this.findById(id, tenantId)
    if (order.status === 'RECEIVED' || order.status === 'PARTIALLY_RECEIVED') {
      throw new ConflictException('Cannot cancel a received order')
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    })
  }

  // Receptions
  async createReception(tenantId: string, data: {
    purchaseOrderId: string
    depositId: string
    notes?: string
    items: Array<{
      purchaseOrderItemId: string
      quantity: number
      notes?: string
    }>
  }, userId?: string) {
    if (!data.depositId) throw new BadRequestException('La recepción requiere depósito')
    if (!data.items?.length) throw new BadRequestException('La recepción requiere al menos un item')

    return this.prisma.$transaction(async (tx) => {
      const [order, deposit] = await Promise.all([
        tx.purchaseOrder.findFirst({
          where: { id: data.purchaseOrderId, tenantId },
          include: { items: true },
        }),
        tx.deposit.findFirst({ where: { id: data.depositId, tenantId, isActive: true }, select: { id: true } }),
      ])

      if (!order) throw new NotFoundException('Purchase order not found')
      if (!deposit) throw new BadRequestException('Depósito inválido')
      if (order.status === PurchaseOrderStatus.CANCELLED || order.status === PurchaseOrderStatus.RECEIVED) {
        throw new BadRequestException('La orden no admite nuevas recepciones')
      }

      const itemsById = new Map(order.items.map((item) => [item.id, item]))
      const receptionItems = data.items.map((item) => {
        const orderItem = itemsById.get(item.purchaseOrderItemId)
        if (!orderItem) throw new BadRequestException('Item de orden inválido')
        const quantity = Number(item.quantity || 0)
        const pending = Number(orderItem.quantity) - Number(orderItem.receivedQuantity)
        if (quantity <= 0) throw new BadRequestException('La cantidad recibida debe ser mayor a cero')
        if (quantity > pending + 0.0001) throw new BadRequestException('La cantidad recibida supera el pendiente')
        return { input: item, orderItem, quantity }
      })

      const reception = await tx.purchaseReception.create({
        data: {
          tenantId,
          purchaseOrderId: data.purchaseOrderId,
          depositId: data.depositId,
          notes: data.notes,
          createdById: userId,
          items: {
            create: receptionItems.map(({ input, quantity }) => ({
              purchaseOrderItemId: input.purchaseOrderItemId,
              quantity,
              notes: input.notes,
            })),
          },
        },
        include: {
          deposit: true,
          items: {
            include: {
              purchaseOrderItem: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      })

      for (const { orderItem, quantity } of receptionItems) {
        await tx.purchaseOrderItem.update({
          where: { id: orderItem.id },
          data: { receivedQuantity: { increment: quantity } },
        })
        await tx.stockMovement.create({
          data: {
            tenantId,
            createdById: userId,
            productId: orderItem.productId,
            depositId: data.depositId,
            type: StockMovementType.PURCHASE,
            quantity,
            unitCost: Number(orderItem.unitPrice || 0),
            notes: `Recepción OC #${order.number}${data.notes ? ` - ${data.notes}` : ''}`,
          },
        })
        await this.recalculateAverageCost(tx, tenantId, orderItem.productId)
      }

      const orderItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: data.purchaseOrderId },
      })

      const allReceived = orderItems.every((item) => Number(item.receivedQuantity) >= Number(item.quantity))
      const someReceived = orderItems.some((item) => Number(item.receivedQuantity) > 0)

      let newStatus: PurchaseOrderStatus = order.status
      if (allReceived) {
        newStatus = PurchaseOrderStatus.RECEIVED
      } else if (someReceived) {
        newStatus = PurchaseOrderStatus.PARTIALLY_RECEIVED
      }

      if (newStatus !== order.status) {
        await tx.purchaseOrder.update({
          where: { id: data.purchaseOrderId },
          data: { status: newStatus },
        })
      }

      return reception
    })
  }

  async getReceptions(tenantId: string, purchaseOrderId?: string) {
    return this.prisma.purchaseReception.findMany({
      where: {
        tenantId,
        ...(purchaseOrderId && { purchaseOrderId }),
      },
      include: {
        purchaseOrder: {
          include: {
            supplier: true,
          },
        },
        deposit: true,
        items: {
          include: {
            purchaseOrderItem: {
              include: {
                product: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        receptionDate: 'desc',
      },
    })
  }

  async getReceptionById(id: string, tenantId: string) {
    const reception = await this.prisma.purchaseReception.findFirst({
      where: { id, tenantId },
      include: {
        purchaseOrder: {
          include: {
            supplier: true,
          },
        },
        deposit: true,
        items: {
          include: {
            purchaseOrderItem: {
              include: {
                product: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })
    if (!reception) {
      throw new NotFoundException('Reception not found')
    }
    return reception
  }

  private roundMoney(value: number): number {
    return Math.round(Number(value || 0) * 100) / 100
  }

  private async recalculateAverageCost(tx: any, tenantId: string, productId: string): Promise<void> {
    const rows = await tx.$queryRaw(Prisma.sql`
      SELECT
        COALESCE(SUM("quantity"), 0)::float AS "quantity",
        COALESCE(SUM("quantity" * "unitCost"), 0)::float AS "value"
      FROM "stock_movements"
      WHERE "tenantId" = ${tenantId}
        AND "productId" = ${productId}
        AND "quantity" > 0
    `) as Array<{ quantity: number; value: number }>
    const quantity = Number(rows[0]?.quantity ?? 0)
    if (quantity <= 0) return
    await tx.product.update({
      where: { id: productId },
      data: {
        lastPurchaseCost: await this.lastPurchaseCost(tx, tenantId, productId),
        averageCost: this.roundMoney(Number(rows[0]?.value ?? 0) / quantity),
      },
    })
  }

  private async lastPurchaseCost(tx: any, tenantId: string, productId: string): Promise<number> {
    const movement = await tx.stockMovement.findFirst({
      where: { tenantId, productId, type: StockMovementType.PURCHASE, quantity: { gt: 0 } },
      orderBy: { createdAt: 'desc' },
      select: { unitCost: true },
    })
    return Number(movement?.unitCost ?? 0)
  }
}
