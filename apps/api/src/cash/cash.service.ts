import { BadRequestException, Injectable } from '@nestjs/common';
import { CashMovementType, CashSessionStatus, PaymentMethod, Prisma } from '@erp/db';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { parseMoney } from '../common/money';

type CashCountInput = {
  method?: PaymentMethod | string;
  currency?: string;
  countedAmount?: number | string;
};

@Injectable()
export class CashService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async current(tenantId: string) {
    const session = await this.prisma.cashSession.findFirst({
      where: { tenantId, status: CashSessionStatus.OPEN },
      include: {
        movements: { include: { document: true }, orderBy: { createdAt: 'desc' }, take: 300 },
      },
      orderBy: { openedAt: 'desc' },
    });
    if (!session) return null;
    const counts = await this.readCounts([session.id]);
    return this.withBreakdown({ ...session, counts: counts.get(session.id) ?? [] });
  }

  async list(tenantId: string, includeLegacy = false) {
    const legacyDescriptionFilter: Prisma.CashMovementWhereInput = {
      OR: [
        { description: { contains: 'legacy', mode: 'insensitive' } },
        { description: { contains: 'migra', mode: 'insensitive' } },
      ],
    };
    const movementWhere = includeLegacy ? undefined : { NOT: legacyDescriptionFilter };
    const sessions = await this.prisma.cashSession.findMany({
      where: {
        tenantId,
        ...(includeLegacy ? {} : { movements: { some: movementWhere } }),
      },
      include: {
        movements: { where: movementWhere, include: { document: true }, orderBy: { createdAt: 'desc' }, take: 10 },
      },
      orderBy: { openedAt: 'desc' },
      take: 60,
    });
    const counts = await this.readCounts(sessions.map((session) => session.id));
    return sessions.map((session) => this.withBreakdown({ ...session, counts: counts.get(session.id) ?? [] }));
  }

  async open(tenantId: string, userId: string, role: string, data: { openingAmount?: number | string; note?: string }) {
    // N-01/C-04 fix: pg_advisory_xact_lock requiere una transacción activa para durar
    // hasta el commit. Fuera de $transaction, Prisma lo ejecuta en autocommit y el lock
    // se libera inmediatamente, dejando la protección contra apertura concurrente ilusoria.
    const session = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(CONCAT('cash_open_', ${tenantId})))`,
      );
      const existing = await tx.cashSession.findFirst({
        where: { tenantId, status: CashSessionStatus.OPEN },
      });
      if (existing) throw new BadRequestException('Ya hay una caja abierta');

      const openingAmount = this.toMoney(data.openingAmount);
      return tx.cashSession.create({
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
        include: { movements: { include: { document: true } } },
      });
    });

    await this.audit.record({
      tenantId,
      userId,
      action: 'cash.open',
      entityType: 'CashSession',
      entityId: session.id,
      summary: `Caja abierta con ${session.openingAmount}`,
      metadata: { openingAmount: session.openingAmount },
    });
    return session;
  }

  async move(tenantId: string, userId: string, role: string, data: { type: 'CASH_IN' | 'CASH_OUT'; amount: number | string; description?: string; reference?: string }) {
    const session = await this.current(tenantId);
    if (!session) throw new BadRequestException('No hay caja abierta');
    if (!data.description || !data.description.trim()) {
      throw new BadRequestException('El concepto del movimiento es obligatorio');
    }
    const amount = this.toMoney(data.amount);
    if (amount <= 0) throw new BadRequestException('El importe debe ser mayor a cero');
    const signedAmount = data.type === 'CASH_OUT' ? amount * -1 : amount;

    const movement = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(
        Prisma.sql`SELECT id FROM "cash_sessions" WHERE id = ${session.id} FOR UPDATE`,
      );

      const stillOpen = await tx.cashSession.findFirst({
        where: { id: session.id, status: CashSessionStatus.OPEN },
        select: { id: true },
      });
      if (!stillOpen) throw new BadRequestException('La caja fue cerrada');

      const m = await tx.cashMovement.create({
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

      const total = await tx.cashMovement.aggregate({
        where: { sessionId: session.id },
        _sum: { amount: true },
      });
      await tx.cashSession.update({
        where: { id: session.id },
        data: { expectedAmount: this.roundMoney(Number(total._sum.amount ?? 0)) },
      });

      return m;
    });

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

  async close(tenantId: string, userId: string, role: string, data: { countedAmount?: number | string; counts?: CashCountInput[]; note?: string }) {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.cashSession.findFirst({
        where: { tenantId, status: CashSessionStatus.OPEN },
      include: { movements: { include: { document: true }, orderBy: { createdAt: 'desc' } } },
      });
      if (!session) throw new BadRequestException('No hay caja abierta');

      await tx.$executeRaw(
        Prisma.sql`SELECT id FROM "cash_sessions" WHERE id = ${session.id} FOR UPDATE`,
      );

      const total = await tx.cashMovement.aggregate({
        where: { sessionId: session.id },
        _sum: { amount: true },
      });
      const expectedAmount = this.roundMoney(Number(total._sum.amount ?? 0));
      const counts = this.normalizeCounts(data);
      const countedAmount = this.roundMoney(counts.reduce((sum, count) => sum + count.countedAmount, 0));
      const difference = this.roundMoney(countedAmount - expectedAmount);
      if (Math.abs(difference) > 0.01 && !String(data.note || '').trim()) {
        throw new BadRequestException('El cierre con diferencia requiere observaciones');
      }

      await tx.$executeRaw(Prisma.sql`DELETE FROM "cash_session_counts" WHERE "sessionId" = ${session.id}`);
      for (const count of counts) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "cash_session_counts" ("id", "sessionId", "method", "currency", "countedAmount", "createdAt")
          VALUES (gen_random_uuid()::text, ${session.id}, ${count.method}::"PaymentMethod", ${count.currency}, ${count.countedAmount}, NOW())
          ON CONFLICT ("sessionId", "method", "currency")
          DO UPDATE SET "countedAmount" = EXCLUDED."countedAmount"
        `);
      }

      const result = await tx.cashSession.updateMany({
        where: { id: session.id, status: CashSessionStatus.OPEN },
        data: {
          status: CashSessionStatus.CLOSED,
          closedById: userId,
          closedAt: new Date(),
          expectedAmount,
          countedAmount,
          difference,
          closingNote: data.note || null,
        },
      });
      if (result.count === 0) {
        throw new BadRequestException('La caja ya estaba cerrada');
      }

      const closed = await tx.cashSession.findUnique({
        where: { id: session.id },
        include: {
          movements: { include: { document: true }, orderBy: { createdAt: 'desc' } },
        },
      });

      await this.audit.record({
        tenantId,
        userId,
        action: 'cash.close',
        entityType: 'CashSession',
        entityId: session.id,
        summary: `Caja cerrada. Diferencia: ${difference}`,
        metadata: { expectedAmount, countedAmount, difference, counts },
      });
      return closed ? this.withBreakdown({ ...closed, counts }) : closed;
    });
  }

  async recordSalePayment(tx: any, tenantId: string, userId: string, documentId: string, method: PaymentMethod, amount: number, description: string) {
    const session = await tx.cashSession.findFirst({
      where: { tenantId, status: CashSessionStatus.OPEN },
      orderBy: { openedAt: 'desc' },
      select: { id: true },
    });
    if (!session) {
      throw new BadRequestException('No hay caja abierta. Abrí caja antes de confirmar una venta en efectivo.');
    }

    await tx.$executeRaw(
      Prisma.sql`SELECT id FROM "cash_sessions" WHERE id = ${session.id} FOR UPDATE`,
    );

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
    return this.roundMoney(parseMoney(value));
  }

  private normalizeCounts(data: { countedAmount?: number | string; counts?: CashCountInput[] }) {
    const rawCounts = Array.isArray(data.counts) && data.counts.length > 0
      ? data.counts
      : [{ method: PaymentMethod.CASH, currency: 'ARS', countedAmount: data.countedAmount ?? 0 }];
    const allowedMethods = new Set(Object.values(PaymentMethod));
    return rawCounts
      .map((item) => {
        const method = String(item.method || PaymentMethod.CASH) as PaymentMethod;
        if (!allowedMethods.has(method)) {
          throw new BadRequestException(`Método de caja inválido: ${method}`);
        }
        return {
          method,
          currency: String(item.currency || 'ARS').trim().toUpperCase() || 'ARS',
          countedAmount: this.toMoney(item.countedAmount),
        };
      })
      .filter((item) => item.countedAmount !== 0 || item.method === PaymentMethod.CASH);
  }

  private async readCounts(sessionIds: string[]) {
    const counts = new Map<string, Array<{ method: PaymentMethod; currency: string; countedAmount: number }>>();
    if (sessionIds.length === 0) return counts;
    const rows = await this.prisma.$queryRaw<Array<{ sessionId: string; method: PaymentMethod; currency: string; countedAmount: number }>>(Prisma.sql`
      SELECT "sessionId", method::text as method, currency, "countedAmount"::float as "countedAmount"
      FROM "cash_session_counts"
      WHERE "sessionId" IN (${Prisma.join(sessionIds)})
    `);
    for (const row of rows) {
      const current = counts.get(row.sessionId) ?? [];
      current.push(row);
      counts.set(row.sessionId, current);
    }
    return counts;
  }

  private withBreakdown<T extends { movements?: any[]; counts?: any[] }>(session: T): T & { breakdown: any[] } {
    const expected = new Map<string, { method: PaymentMethod; currency: string; opening: number; entries: number; exits: number; expected: number }>();
    const counted = new Map<string, number>();
    for (const count of session.counts ?? []) {
      counted.set(this.breakdownKey(count.method, count.currency), this.roundMoney(Number(count.countedAmount || 0)));
    }
    for (const movement of session.movements ?? []) {
      const method = movement.method as PaymentMethod;
      const currency = 'ARS';
      const key = this.breakdownKey(method, currency);
      const current = expected.get(key) ?? { method, currency, opening: 0, entries: 0, exits: 0, expected: 0 };
      const amount = this.roundMoney(Number(movement.amount || 0));
      if (movement.type === CashMovementType.OPENING) current.opening += amount;
      else if (amount >= 0) current.entries += amount;
      else current.exits += Math.abs(amount);
      current.expected += amount;
      expected.set(key, current);
    }

    const methods = new Set([...expected.keys(), ...counted.keys()]);
    const breakdown = [...methods].sort().map((key) => {
      const row = expected.get(key);
      const [method, currency] = key.split(':') as [PaymentMethod, string];
      const countedAmount = counted.get(key) ?? 0;
      const expectedAmount = this.roundMoney(row?.expected ?? 0);
      return {
        method: row?.method ?? method,
        currency: row?.currency ?? currency,
        opening: this.roundMoney(row?.opening ?? 0),
        entries: this.roundMoney(row?.entries ?? 0),
        exits: this.roundMoney(row?.exits ?? 0),
        expectedAmount,
        countedAmount,
        difference: this.roundMoney(countedAmount - expectedAmount),
      };
    });

    return { ...session, breakdown };
  }

  private breakdownKey(method: PaymentMethod | string, currency: string) {
    return `${method}:${String(currency || 'ARS').toUpperCase()}`;
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
