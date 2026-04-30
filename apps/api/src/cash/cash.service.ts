import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CashMovementType, CashSessionStatus, PaymentMethod } from '@erp/db';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { assertPermission } from '../common/permissions';

@Injectable()
export class CashService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async current(tenantId: string) {
    return this.prisma.cashSession.findFirst({
      where: { tenantId, status: CashSessionStatus.OPEN },
      include: { movements: { orderBy: { createdAt: 'desc' }, take: 50 } },
      orderBy: { openedAt: 'desc' },
    });
  }

  list(tenantId: string) {
    return this.prisma.cashSession.findMany({
      where: { tenantId },
      include: { movements: { orderBy: { createdAt: 'desc' }, take: 10 } },
      orderBy: { openedAt: 'desc' },
      take: 60,
    });
  }

  async open(tenantId: string, userId: string, role: string, data: { openingAmount?: number | string; note?: string }) {
    assertPermission(role, 'cash.open');
    const existing = await this.current(tenantId);
    if (existing) throw new BadRequestException('Ya hay una caja abierta');

    const openingAmount = this.toMoney(data.openingAmount);
    const session = await this.prisma.cashSession.create({
      data: {
        tenantId,
        openedById: userId,
        openingAmount,
        expectedAmount: openingAmount,
        openingNote: data.note || null,
        movements: {
          create: {
            tenantId,
            createdById: userId,
            type: CashMovementType.OPENING,
            method: PaymentMethod.CASH,
            amount: openingAmount,
            description: 'Apertura de caja',
          },
        },
      },
      include: { movements: true },
    });
    await this.audit.record({
      tenantId,
      userId,
      action: 'cash.open',
      entityType: 'CashSession',
      entityId: session.id,
      summary: `Caja abierta con ${openingAmount}`,
      metadata: { openingAmount },
    });
    return session;
  }

  async move(tenantId: string, userId: string, role: string, data: { type: 'CASH_IN' | 'CASH_OUT'; amount: number | string; description?: string; reference?: string }) {
    assertPermission(role, 'cash.move');
    const session = await this.current(tenantId);
    if (!session) throw new BadRequestException('No hay caja abierta');
    const amount = this.toMoney(data.amount);
    if (amount <= 0) throw new BadRequestException('El importe debe ser mayor a cero');
    const signedAmount = data.type === 'CASH_OUT' ? amount * -1 : amount;

    const movement = await this.prisma.cashMovement.create({
      data: {
        tenantId,
        sessionId: session.id,
        createdById: userId,
        type: data.type === 'CASH_OUT' ? CashMovementType.CASH_OUT : CashMovementType.CASH_IN,
        method: PaymentMethod.CASH,
        amount: signedAmount,
        description: data.description || (data.type === 'CASH_OUT' ? 'Egreso manual' : 'Ingreso manual'),
        reference: data.reference || null,
      },
    });
    await this.recalculateExpected(session.id);
    await this.audit.record({
      tenantId,
      userId,
      action: data.type === 'CASH_OUT' ? 'cash.out' : 'cash.in',
      entityType: 'CashMovement',
      entityId: movement.id,
      summary: movement.description,
      metadata: { amount: signedAmount, sessionId: session.id },
    });
    return movement;
  }

  async close(tenantId: string, userId: string, role: string, data: { countedAmount?: number | string; note?: string }) {
    assertPermission(role, 'cash.close');
    const session = await this.current(tenantId);
    if (!session) throw new BadRequestException('No hay caja abierta');
    const expectedAmount = await this.recalculateExpected(session.id);
    const countedAmount = this.toMoney(data.countedAmount);
    const difference = this.roundMoney(countedAmount - expectedAmount);
    const closed = await this.prisma.cashSession.update({
      where: { id: session.id },
      data: {
        status: CashSessionStatus.CLOSED,
        closedById: userId,
        closedAt: new Date(),
        expectedAmount,
        countedAmount,
        difference,
        closingNote: data.note || null,
      },
      include: { movements: { orderBy: { createdAt: 'desc' } } },
    });
    await this.audit.record({
      tenantId,
      userId,
      action: 'cash.close',
      entityType: 'CashSession',
      entityId: session.id,
      summary: `Caja cerrada. Diferencia: ${difference}`,
      metadata: { expectedAmount, countedAmount, difference },
    });
    return closed;
  }

  async recordSalePayment(tx: any, tenantId: string, userId: string, documentId: string, method: PaymentMethod, amount: number, description: string) {
    const session = await tx.cashSession.findFirst({
      where: { tenantId, status: CashSessionStatus.OPEN },
      orderBy: { openedAt: 'desc' },
      select: { id: true },
    });
    if (!session) {
      throw new BadRequestException('Abrí una caja antes de confirmar ventas de contado');
    }

    await tx.cashMovement.create({
      data: {
        tenantId,
        sessionId: session.id,
        documentId,
        createdById: userId,
        type: CashMovementType.SALE_PAYMENT,
        method,
        amount: this.roundMoney(amount),
        description,
      },
    });

    const total = await tx.cashMovement.aggregate({
      where: { sessionId: session.id },
      _sum: { amount: true },
    });
    await tx.cashSession.update({
      where: { id: session.id },
      data: { expectedAmount: this.roundMoney(Number(total._sum.amount ?? 0)) },
    });
  }

  private async recalculateExpected(sessionId: string) {
    const total = await this.prisma.cashMovement.aggregate({
      where: { sessionId },
      _sum: { amount: true },
    });
    const expectedAmount = this.roundMoney(Number(total._sum.amount ?? 0));
    await this.prisma.cashSession.update({ where: { id: sessionId }, data: { expectedAmount } });
    return expectedAmount;
  }

  private toMoney(value: unknown): number {
    if (value === undefined || value === null || value === '') return 0;
    const parsed = Number(String(value).replace(',', '.'));
    return this.roundMoney(Number.isFinite(parsed) ? parsed : 0);
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
