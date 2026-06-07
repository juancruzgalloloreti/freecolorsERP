import { Module } from '@nestjs/common'
import { PreciosEspecialesService } from './precios-especiales.service'
import { PreciosEspecialesController } from './precios-especiales.controller'

@Module({
  controllers: [PreciosEspecialesController],
  providers: [PreciosEspecialesService],
  exports: [PreciosEspecialesService],
})
export class PreciosEspecialesModule {}
