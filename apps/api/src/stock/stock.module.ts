import { Module } from '@nestjs/common';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({ imports: [PermissionsModule], controllers: [StockController], providers: [StockService] })
export class StockModule {}

