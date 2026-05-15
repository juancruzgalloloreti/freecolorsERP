import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { RequirePermissionGuard } from '../permissions/guards/require-permission.guard';
import { PriceListsService } from './price-lists.service';

@UseGuards(JwtAuthGuard, RequirePermissionGuard)
@Controller('priceLists')
export class PriceListsController {
  constructor(private readonly service: PriceListsService) {}
  @RequirePermission('stock.view', 'price.update')
  @Get() findAll(@Req() req: any) { return this.service.findAll(req.user.tenantId, req.user.role); }
  @RequirePermission('price.update')
  @Post() create(@Req() req: any, @Body() body: any) { return this.service.create(req.user.tenantId, req.user.role, body); }
  @RequirePermission('price.update')
  @Patch(':priceListId/items/:productId') updateItem(@Req() req: any, @Param('priceListId') priceListId: string, @Param('productId') productId: string, @Body() body: any) {
    if (body.price === undefined) {
      throw new BadRequestException('price es requerido');
    }
    return this.service.updateItem(req.user.tenantId, req.user.role, priceListId, productId, Number(body.price));
  }

  @RequirePermission('price.update')
  @Post(':priceListId/recalculate')
  recalculate(@Req() req: any, @Param('priceListId') priceListId: string, @Body() body: any) {
    return this.service.recalculateFromBase(req.user.tenantId, priceListId, req.user.role, body);
  }

  @RequirePermission('price.update')
  @Patch(':priceListId/formula')
  updateFormula(@Req() req: any, @Param('priceListId') priceListId: string, @Body() body: any) {
    return this.service.updateFormula(req.user.tenantId, req.user.role, priceListId, body);
  }

  @RequirePermission('price.update')
  @Get('coefficients')
  coefficients(@Req() req: any) {
    return this.service.coefficients(req.user.tenantId);
  }

  @RequirePermission('price.update')
  @Post('coefficients')
  createCoefficient(@Req() req: any, @Body() body: any) {
    return this.service.createCoefficient(req.user.tenantId, req.user.role, body);
  }

  @RequirePermission('price.update')
  @Delete('coefficients/:id')
  removeCoefficient(@Req() req: any, @Param('id') id: string) {
    return this.service.removeCoefficient(req.user.tenantId, req.user.role, id);
  }

  @RequirePermission('price.update')
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.remove(req.user.tenantId, req.user.role, id);
  }
}


