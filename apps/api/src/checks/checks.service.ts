import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { CashMovementType, CashSessionStatus, CcEntryType, PaymentMethod, Prisma } from '@erp/db'
import { PrismaService } from '../common/prisma.service'
import { pageParams, paged } from '../common/pagination'

const CheckStatus = {
  RECEIVED: 'RECEIVED',
  DEPOSITED: 'DEPOSITED',
  CLEARED: 'CLEARED',
  BOUNCED: 'BOUNCED',
  ENDORSED: 'ENDORSED',
  CANCELLED: 'CANCELLED',
} as const

@Injectable()
export class ChecksService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, data: {
    number: string
    bank: string
    accountOwner: string
    amount: number
    issueDate?: string
    dueDate: string
    isEcheq?: boolean
    notes?: string
  }) {
    if (!data.number?.trim()) throw new BadRequestException('El número de cheque es obligatorio')
    if (!data.bank?.trim()) throw new BadRequestException('El banco es obligatorio')
    if (!data.accountOwner?.trim()) throw new BadRequestException('El titular es obligatorio')
    if (Number(data.amount || 0) <= 0) throw new BadRequestException('El importe debe ser mayor a cero')
    if (!data.dueDate) throw new BadRequestException('La fecha de vencimiento es obligatoria')

    return this.prisma.check.create({
      data: {
        tenantId,
        number: data.number.trim(),
        bank: data.bank.trim(),
        accountOwner: data.accountOwner.trim(),
        amount: Math.round(Number(data.amount) * 100) / 100,
        issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
        dueDate: new Date(data.dueDate),
        isEcheq: Boolean(data.isEcheq),
        notes: data.notes?.trim() || null,
      },
    })
  }

  async findAll(tenantId: string, query: { search?: string; status?: string; startDate?: string; endDate?: string; page?: number | string; limit?: number | string }) {
    const shouldPage = query.page !== undefined;
    const { page, limit, skip } = pageParams(query, 50, 200);
    const where: any = {
      tenantId,
      ...(query?.status && { status: query.status as any }),
      ...(query?.startDate && { dueDate: { gte: new Date(query.startDate) } }),
      ...(query?.endDate && { dueDate: { lte: new Date(query.endDate) } }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.check.findMany({
        where,
        include: {
          payment: {
            include: { document: true },
          },
        },
        orderBy: { dueDate: 'desc' },
        skip: shouldPage ? skip : undefined,
        take: shouldPage ? limit : 50,
      }),
      shouldPage ? this.prisma.check.count({ where }) : Promise.resolve(0),
    ]);
    return shouldPage ? paged(rows, total, page, limit) : rows;
  }

  async findById(id: string, tenantId: string) {
    const check = await this.prisma.check.findFirst({
      where: { id, tenantId },
      include: {
        payment: {
          include: {
            document: true,
          },
        },
      },
    })
    if (!check) {
      throw new NotFoundException('Cheque no encontrado')
    }
    return check
  }

  async deposit(id: string, tenantId: string, data: { depositDate?: string }) {
    const check = await this.findById(id, tenantId)
    if (check.status !== CheckStatus.RECEIVED) {
      throw new BadRequestException('El cheque debe estar en estado Recibido para depositarse')
    }

    return this.prisma.check.update({
      where: { id },
      data: {
        status: CheckStatus.DEPOSITED,
      },
    })
  }

  async clear(id: string, tenantId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const check = await this.findByIdTx(tx, id, tenantId)
      if (check.status !== CheckStatus.DEPOSITED) {
        throw new BadRequestException('El cheque debe estar en estado Depositado para compensarse')
      }

      const updated = await tx.check.update({
        where: { id },
        data: { status: CheckStatus.CLEARED },
      })

      if (!check.paymentId) {
        await this.createCashMovementTx(tx, {
          tenantId,
          userId,
          documentId: null,
          type: CashMovementType.CASH_IN,
          amount: Number(check.amount),
          description: `Acreditación cheque ${check.number}`,
          reference: check.number,
        })
      }

      return updated
    })
  }

  async bounce(id: string, tenantId: string, userId: string, data: { reason: string }) {
    return this.prisma.$transaction(async (tx) => {
      const check = await this.findByIdTx(tx, id, tenantId)
      if (check.status === CheckStatus.CLEARED || check.status === CheckStatus.CANCELLED) {
        throw new BadRequestException('No se puede rechazar un cheque cobrado o cancelado')
      }
      if (check.status === CheckStatus.BOUNCED) {
        throw new BadRequestException('Este cheque ya fue rechazado')
      }

      const updated = await tx.check.update({
        where: { id },
        data: {
          status: CheckStatus.BOUNCED,
          rejectionReason: data.reason,
          rejectionDate: new Date(),
        },
      })

      if (check.paymentId) {
        await this.createCashMovementTx(tx, {
          tenantId,
          userId,
          documentId: check.payment?.documentId ?? null,
          type: CashMovementType.CASH_OUT,
          amount: Number(check.amount) * -1,
          description: `Rechazo cheque ${check.number}`,
          reference: check.number,
        })
        await this.restoreCustomerDebtTx(tx, tenantId, userId, check, data.reason)
      }

      return updated
    })
  }

  async endorse(id: string, tenantId: string, userId: string, data: { endorsedTo: string }) {
    return this.prisma.$transaction(async (tx) => {
      const check = await this.findByIdTx(tx, id, tenantId)
      if (check.status !== CheckStatus.RECEIVED) {
        throw new BadRequestException('El cheque debe estar en estado Recibido para endosarse')
      }

      const updated = await tx.check.update({
        where: { id },
        data: {
          status: CheckStatus.ENDORSED,
          endorsedTo: data.endorsedTo,
          endorsedDate: new Date(),
        },
      })

      if (check.paymentId) {
        await this.createCashMovementTx(tx, {
          tenantId,
          userId,
          documentId: check.payment?.documentId ?? null,
          type: CashMovementType.CASH_OUT,
          amount: Number(check.amount) * -1,
          description: `Endoso cheque ${check.number} a ${data.endorsedTo}`,
          reference: check.number,
        })
      }

      return updated
    })
  }

  async cancel(id: string, tenantId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const check = await this.findByIdTx(tx, id, tenantId)
      if (check.status === CheckStatus.CLEARED || check.status === CheckStatus.BOUNCED) {
        throw new BadRequestException('No se puede cancelar un cheque cobrado o rechazado')
      }
      if (check.status === CheckStatus.DEPOSITED) {
        throw new BadRequestException('Este cheque ya fue depositado y no puede cancelarse desde el sistema')
      }
      if (check.status === CheckStatus.ENDORSED) {
        throw new BadRequestException('Este cheque ya fue endosado y no puede cancelarse desde el sistema')
      }

      const updated = await tx.check.update({
        where: { id },
        data: { status: CheckStatus.CANCELLED },
      })

      if (check.paymentId) {
        await this.createCashMovementTx(tx, {
          tenantId,
          userId,
          documentId: check.payment?.documentId ?? null,
          type: CashMovementType.CASH_OUT,
          amount: Number(check.amount) * -1,
          description: `Cancelación cheque ${check.number}`,
          reference: check.number,
        })
        await this.restoreCustomerDebtTx(tx, tenantId, userId, check, 'Cheque cancelado')
      }

      return updated
    })
  }

  async getSummary(tenantId: string) {
    const checks = await this.prisma.check.findMany({
      where: { tenantId },
    })

    const summary = {
      total: checks.length,
      received: checks.filter((c) => c.status === CheckStatus.RECEIVED).length,
      deposited: checks.filter((c) => c.status === CheckStatus.DEPOSITED).length,
      cleared: checks.filter((c) => c.status === CheckStatus.CLEARED).length,
      bounced: checks.filter((c) => c.status === CheckStatus.BOUNCED).length,
      endorsed: checks.filter((c) => c.status === CheckStatus.ENDORSED).length,
      cancelled: checks.filter((c) => c.status === CheckStatus.CANCELLED).length,
      totalAmount: checks.reduce((sum, c) => sum + Number(c.amount || 0), 0),
      pendingAmount: checks
        .filter((c) => c.status === CheckStatus.RECEIVED || c.status === CheckStatus.DEPOSITED)
        .reduce((sum, c) => sum + Number(c.amount || 0), 0),
    }

    return summary
  }

  private async findByIdTx(tx: Prisma.TransactionClient, id: string, tenantId: string) {
    const check = await tx.check.findFirst({
      where: { id, tenantId },
      include: {
        payment: {
          include: { document: true },
        },
      },
    })
    if (!check) throw new NotFoundException('Cheque no encontrado')
    return check
  }

  private async createCashMovementTx(tx: Prisma.TransactionClient, data: {
    tenantId: string
    userId: string
    documentId: string | null
    type: CashMovementType
    amount: number
    description: string
    reference: string
  }) {
    const session = await tx.cashSession.findFirst({
      where: { tenantId: data.tenantId, status: CashSessionStatus.OPEN },
      orderBy: { openedAt: 'desc' },
      select: { id: true },
    })
    if (!session) throw new BadRequestException('No hay caja abierta para registrar el impacto del cheque')

    await tx.$executeRaw(Prisma.sql`SELECT id FROM "cash_sessions" WHERE id = ${session.id} FOR UPDATE`)
    await tx.cashMovement.create({
      data: {
        tenantId: data.tenantId,
        sessionId: session.id,
        documentId: data.documentId,
        createdById: data.userId,
        type: data.type,
        method: PaymentMethod.CHECK,
        amount: this.roundMoney(data.amount),
        description: data.description,
        reference: data.reference,
      },
    })
    const total = await tx.cashMovement.aggregate({
      where: { sessionId: session.id },
      _sum: { amount: true },
    })
    await tx.cashSession.update({
      where: { id: session.id },
      data: { expectedAmount: this.roundMoney(Number(total._sum.amount ?? 0)) },
    })
  }

  private async restoreCustomerDebtTx(tx: Prisma.TransactionClient, tenantId: string, userId: string, check: Awaited<ReturnType<ChecksService['findByIdTx']>>, reason: string) {
    const document = check.payment?.document
    if (!document?.customerId) return
    await tx.currentAccountEntry.create({
      data: {
        tenantId,
        createdById: userId,
        customerId: document.customerId,
        documentId: document.id,
        type: CcEntryType.DEBIT_NOTE,
        amount: this.roundMoney(Number(check.amount)),
        description: `Reverso cheque ${check.number}: ${reason || 'sin motivo'}`,
        date: new Date(),
      },
    })
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100
  }
}
