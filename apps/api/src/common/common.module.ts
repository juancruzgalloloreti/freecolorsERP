import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { PrismaService } from './prisma.service';
import { PriceFormulaService } from './price-formula.service';

@Global()
@Module({
  providers: [
    PrismaService,
    PriceFormulaService,
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
  exports: [PrismaService, PriceFormulaService],
})
export class CommonModule {}

