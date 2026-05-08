import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { StockModule } from './stock/stock.module';
import { DocumentsModule } from './documents/documents.module';
import { CustomersModule } from './customers/customers.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { CurrentAccountModule } from './current-account/current-account.module';
import { PriceListsModule } from './price-lists/price-lists.module';
import { ReportsModule } from './reports/reports.module';
import { CommonModule } from './common/common.module';
import { AuditModule } from './audit/audit.module';
import { CashModule } from './cash/cash.module';
import { SalesOrdersModule } from './sales-orders/sales-orders.module';
import { HealthModule } from './health/health.module';
import { PermissionsModule } from './permissions/permissions.module';
import { PurchasesModule } from './purchases/purchases.module';
import { AfipModule } from './afip/afip.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { ChecksModule } from './checks/checks.module';

@Module({
  imports: [
    // Config global desde .env
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting: 100 req / minuto por IP
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // Módulos de negocio
    HealthModule,
    CommonModule,
    AuthModule,
    PermissionsModule,
    ProductsModule,
    StockModule,
    DocumentsModule,
    CustomersModule,
    SuppliersModule,
    CurrentAccountModule,
    PriceListsModule,
    ReportsModule,
    AuditModule,
    CashModule,
    SalesOrdersModule,
    PurchasesModule,
    AfipModule,
    ApprovalsModule,
    ChecksModule,
  ],
})
export class AppModule {}

