import { Module, forwardRef } from '@nestjs/common'
import { PermissionsController } from './permissions.controller'
import { PermissionsService } from './permissions.service'
import { AuditModule } from '../audit/audit.module'

@Module({
  imports: [forwardRef(() => AuditModule)],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
