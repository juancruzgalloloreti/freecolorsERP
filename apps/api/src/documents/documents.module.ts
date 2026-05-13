import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { AuditModule } from '../audit/audit.module';
import { CashModule } from '../cash/cash.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [AuditModule, CashModule, PermissionsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}

