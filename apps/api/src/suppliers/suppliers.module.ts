import { Module } from '@nestjs/common';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({ imports: [PermissionsModule], controllers: [SuppliersController], providers: [SuppliersService] })
export class SuppliersModule {}

