import { Module, forwardRef } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { CommonModule } from '../common/common.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [CommonModule, forwardRef(() => PermissionsModule)],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
