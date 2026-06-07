import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PreciosEspecialesService } from './precios-especiales.service'

@Controller('precios-especiales')
@UseGuards(JwtAuthGuard)
export class PreciosEspecialesController {
  constructor(private readonly service: PreciosEspecialesService) {}

  @Get('cliente/:customerId')
  async findByCustomer(@Req() req: any, @Param('customerId') customerId: string) {
    return this.service.findByCustomer(req.user.tenantId, customerId)
  }

  @Get('producto/:productId')
  async findByProduct(@Req() req: any, @Param('productId') productId: string) {
    return this.service.findByProduct(req.user.tenantId, productId)
  }

  @Post()
  async create(@Req() req: any, @Body() body: any) {
    return this.service.create(req.user.tenantId, req.user.id, body)
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body)
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(id)
  }
}
