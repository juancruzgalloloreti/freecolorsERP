import { Module } from '@nestjs/common'
import { AfipController } from './afip.controller'
import { AfipService } from './afip.service'

@Module({
  controllers: [AfipController],
  providers: [AfipService],
  exports: [AfipService],
})
export class AfipModule {}
