import { Module } from '@nestjs/common'
import { PermissionsModule } from '../permissions/permissions.module'
import { ApprovalsController } from './approvals.controller'
import { ApprovalsService } from './approvals.service'

@Module({
  imports: [PermissionsModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
