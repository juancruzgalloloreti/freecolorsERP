import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { AuditModule } from '../audit/audit.module';
import { SalesOrdersController } from './sales-orders.controller';
import { SalesOrdersService } from './sales-orders.service';

@Module({
  imports: [CommonModule, AuditModule],
  controllers: [SalesOrdersController],
  providers: [SalesOrdersService],
})
export class SalesOrdersModule {}
