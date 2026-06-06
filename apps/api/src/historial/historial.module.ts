import { Module } from '@nestjs/common'
import { PermissionsModule } from '../permissions/permissions.module'
import { HistorialController } from './historial.controller'
import { HistorialService } from './historial.service'

@Module({
  imports: [PermissionsModule],
  controllers: [HistorialController],
  providers: [HistorialService],
})
export class HistorialModule {}
