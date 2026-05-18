import { Module } from '@nestjs/common'
import { AfipController } from './afip.controller'
import { AfipService } from './afip.service'
import { PermissionsModule } from '../permissions/permissions.module'

@Module({
  imports: [PermissionsModule],
  controllers: [AfipController],
  providers: [AfipService],
  exports: [AfipService],
})
export class AfipModule {}
