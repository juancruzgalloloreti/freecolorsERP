import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { PriceListsController } from './price-lists.controller';
import { PriceListsService } from './price-lists.service';

@Module({
  imports: [PermissionsModule],
  controllers: [PriceListsController],
  providers: [PriceListsService],
  exports: [PriceListsService],
})
export class PriceListsModule {}

