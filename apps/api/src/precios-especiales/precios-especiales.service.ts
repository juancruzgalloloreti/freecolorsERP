import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'

@Injectable()
export class PreciosEspecialesService {
  constructor(private prisma: PrismaService) {}

  async findByCustomer(tenantId: string, customerId: string) {
    return this.prisma.$queryRawUnsafe(`
      SELECT pe.*, p.name as "productName", p.code as "productCode"
      FROM precios_especiales pe
      JOIN products p ON p.id = pe."productId"
      WHERE pe."tenantId" = $1 AND pe."customerId" = $2
        AND (pe."validoHasta" IS NULL OR pe."validoHasta" >= NOW())
      ORDER BY p.name ASC
    `, tenantId, customerId)
  }

  async findByProduct(tenantId: string, productId: string) {
    return this.prisma.$queryRawUnsafe(`
      SELECT pe.*, c.name as "customerName"
      FROM precios_especiales pe
      JOIN customers c ON c.id = pe."customerId"
      WHERE pe."tenantId" = $1 AND pe."productId" = $2
        AND (pe."validoHasta" IS NULL OR pe."validoHasta" >= NOW())
      ORDER BY c.name ASC
    `, tenantId, productId)
  }

  async create(tenantId: string, userId: string, data: any) {
    await this.prisma.$executeRawUnsafe(`
      INSERT INTO precios_especiales (id, "tenantId", "customerId", "productId", "precio", "descuento", "listaBase", "validoDesde", "validoHasta", "createdById", observaciones)
      VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, tenantId, data.customerId, data.productId, data.precio, data.descuento || null, data.listaBase || 'LP1', new Date(data.validoDesde || Date.now()), data.validoHasta ? new Date(data.validoHasta) : null, userId, data.observaciones || null)
    return { success: true }
  }

  async update(id: string, data: any) {
    await this.prisma.$executeRawUnsafe(`
      UPDATE precios_especiales SET "precio" = $1, "descuento" = $2, "listaBase" = $3, "validoHasta" = $4, observaciones = $5, "updatedAt" = NOW()
      WHERE id = $6
    `, data.precio, data.descuento || null, data.listaBase || 'LP1', data.validoHasta ? new Date(data.validoHasta) : null, data.observaciones || null, id)
    return { success: true }
  }

  async remove(id: string) {
    await this.prisma.$executeRawUnsafe('DELETE FROM precios_especiales WHERE id = $1', id)
    return { success: true }
  }
}
