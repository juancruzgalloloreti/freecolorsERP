import { Module } from '@nestjs/common'
import { PermissionsModule } from '../permissions/permissions.module'
import { ChecksController } from './checks.controller'
import { ChecksService } from './checks.service'

@Module({
  imports: [PermissionsModule],
  controllers: [ChecksController],
  providers: [ChecksService],
  exports: [ChecksService],
})
export class ChecksModule {}
