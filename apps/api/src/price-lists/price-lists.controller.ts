import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PriceListsService } from './price-lists.service';

@UseGuards(JwtAuthGuard)
@Controller('priceLists')
export class PriceListsController {
  constructor(private readonly service: PriceListsService) {}
  @Get() findAll(@Req() req: any) { return this.service.findAll(req.user.tenantId); }
  @Post() create(@Req() req: any, @Body() body: any) { return this.service.create(req.user.tenantId, req.user.role, body); }
  @Patch(':priceListId/items/:productId') updateItem(@Req() req: any, @Param('priceListId') priceListId: string, @Param('productId') productId: string, @Body() body: any) {
    return this.service.updateItem(req.user.tenantId, req.user.role, priceListId, productId, Number(body.price || 0));
  }

  @Post(':priceListId/recalculate')
  recalculate(@Req() req: any, @Param('priceListId') priceListId: string, @Body() body: any) {
    return this.service.recalculateFromBase(req.user.tenantId, priceListId, req.user.role, body);
  }

  @Get('coefficients')
  coefficients(@Req() req: any) {
    return this.service.coefficients(req.user.tenantId);
  }

  @Post('coefficients')
  createCoefficient(@Req() req: any, @Body() body: any) {
    return this.service.createCoefficient(req.user.tenantId, req.user.role, body);
  }

  @Delete('coefficients/:id')
  removeCoefficient(@Req() req: any, @Param('id') id: string) {
    return this.service.removeCoefficient(req.user.tenantId, req.user.role, id);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.remove(req.user.tenantId, req.user.role, id);
  }
}


