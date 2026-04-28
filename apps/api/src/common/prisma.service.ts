import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@erp/db';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * BUG FIX: la versión original interpolaba tenantId directamente en
   * el string SQL → vulnerabilidad de SQL injection.
   *
   * Usamos $executeRaw con tagged template literal para que Prisma
   * parametrice el valor correctamente.
   *
   * Ejemplo de uso:
   *   await this.withTenant(tenantId, async (tx) => { ... });
   */
  async withTenant<T>(
    tenantId: string,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      // Prisma parametriza el valor — no hay interpolación directa
      await tx.$executeRaw`SET LOCAL app.tenant_id = ${tenantId}`;
      return fn(tx);
    });
  }
}
