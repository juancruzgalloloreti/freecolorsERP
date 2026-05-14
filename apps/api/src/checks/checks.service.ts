import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'

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

  async findAll(tenantId: string, params?: { status?: string; startDate?: string; endDate?: string }) {
    return this.prisma.check.findMany({
      where: {
        tenantId,
        ...(params?.status && { status: params.status as any }),
        ...(params?.startDate && { dueDate: { gte: new Date(params.startDate) } }),
        ...(params?.endDate && { dueDate: { lte: new Date(params.endDate) } }),
      },
      include: {
        payment: {
          include: {
            document: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    })
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

  async clear(id: string, tenantId: string) {
    const check = await this.findById(id, tenantId)
    if (check.status !== CheckStatus.DEPOSITED) {
      throw new BadRequestException('El cheque debe estar en estado Depositado para compensarse')
    }

    return this.prisma.check.update({
      where: { id },
      data: {
        status: CheckStatus.CLEARED,
      },
    })
  }

  async bounce(id: string, tenantId: string, data: { reason: string }) {
    const check = await this.findById(id, tenantId)
    if (check.status === CheckStatus.CLEARED || check.status === CheckStatus.CANCELLED) {
      throw new BadRequestException('No se puede rechazar un cheque cobrado o cancelado')
    }
    if (check.status === CheckStatus.BOUNCED) {
      throw new BadRequestException('Este cheque ya fue rechazado')
    }

    return this.prisma.check.update({
      where: { id },
      data: {
        status: CheckStatus.BOUNCED,
        rejectionReason: data.reason,
        rejectionDate: new Date(),
      },
    })
  }

  async endorse(id: string, tenantId: string, data: { endorsedTo: string }) {
    const check = await this.findById(id, tenantId)
    if (check.status !== CheckStatus.RECEIVED) {
      throw new BadRequestException('El cheque debe estar en estado Recibido para endosarse')
    }

    return this.prisma.check.update({
      where: { id },
      data: {
        status: CheckStatus.ENDORSED,
        endorsedTo: data.endorsedTo,
        endorsedDate: new Date(),
      },
    })
  }

  async cancel(id: string, tenantId: string) {
    const check = await this.findById(id, tenantId)
    if (check.status === CheckStatus.CLEARED || check.status === CheckStatus.BOUNCED) {
      throw new BadRequestException('No se puede cancelar un cheque cobrado o rechazado')
    }
    if (check.status === CheckStatus.DEPOSITED) {
      throw new BadRequestException('Este cheque ya fue depositado y no puede cancelarse desde el sistema')
    }
    if (check.status === CheckStatus.ENDORSED) {
      throw new BadRequestException('Este cheque ya fue endosado y no puede cancelarse desde el sistema')
    }

    return this.prisma.check.update({
      where: { id },
      data: {
        status: CheckStatus.CANCELLED,
      },
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
}
