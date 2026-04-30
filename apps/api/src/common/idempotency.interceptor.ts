import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { catchError, Observable, of, tap, throwError } from 'rxjs';
import { PrismaService } from './prisma.service';

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    if (!MUTATING_METHODS.has(request.method)) return next.handle();

    const key = String(request.headers['idempotency-key'] ?? '').trim();
    if (!key) return next.handle();

    const tenantId = request.user?.tenantId;
    if (!tenantId) return next.handle();
    if (key.length < 8 || key.length > 160) {
      throw new BadRequestException('Idempotency-Key inválida');
    }

    const path = request.originalUrl || request.url || '';
    const requestHash = this.hash({ method: request.method, path, body: request.body ?? null });
    const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS);

    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { tenantId_key: { tenantId, key } },
    });
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new BadRequestException('Idempotency-Key reutilizada con otro payload');
      }
      if (existing.status === 'COMPLETED') {
        if (existing.responseCode) response.status(existing.responseCode);
        return of(existing.responseBody);
      }
      throw new ConflictException('La operación idempotente todavía está en proceso');
    }

    await this.prisma.idempotencyKey.create({
      data: {
        tenantId,
        key,
        method: request.method,
        path,
        requestHash,
        expiresAt,
      },
    });

    return next.handle().pipe(
      tap(async (body) => {
        await this.prisma.idempotencyKey.update({
          where: { tenantId_key: { tenantId, key } },
          data: {
            status: 'COMPLETED',
            responseCode: response.statusCode,
            responseBody: body ?? null,
            expiresAt,
          },
        });
      }),
      catchError((error) => {
        void this.prisma.idempotencyKey.update({
          where: { tenantId_key: { tenantId, key } },
          data: { status: 'FAILED', responseCode: error?.status ?? 500 },
        }).catch(() => undefined);
        return throwError(() => error);
      }),
    );
  }

  private hash(value: unknown): string {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }
}
