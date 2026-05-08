import { Module } from '@nestjs/common'
import { PermissionsModule } from '../permissions/permissions.module'
import { PurchasesController } from './purchases.controller'
import { PurchasesService } from './purchases.service'

@Module({
  imports: [PermissionsModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
