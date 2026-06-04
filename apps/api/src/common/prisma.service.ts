import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@erp/db';

function databaseUrlWithPoolDefaults(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has('connection_limit')) {
      parsed.searchParams.set('connection_limit', '5');
    }
    if (!parsed.searchParams.has('pool_timeout')) {
      parsed.searchParams.set('pool_timeout', '20');
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      datasources: {
        db: {
          url: databaseUrlWithPoolDefaults(process.env.DATABASE_URL),
        },
      },
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

