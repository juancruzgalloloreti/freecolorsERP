import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { RequirePermissionGuard } from '../permissions/guards/require-permission.guard';
import { SalesOrdersService } from './sales-orders.service';

@UseGuards(JwtAuthGuard, RequirePermissionGuard)
@Controller('sales-orders')
export class SalesOrdersController {
  constructor(private readonly service: SalesOrdersService) {}

  @Get()
  @RequirePermission('sale.view')
  findAll(@Req() req: any, @Query() query: any): any {
    return this.service.findAll(req.user.tenantId, query);
  }

  @Get('export')
  @RequirePermission('sale.view')
  async export(@Req() req: any, @Res() res: any, @Query() query: any): Promise<any> {
    const csv = await this.service.exportCsv(req.user.tenantId, query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="pedidos-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send(`\uFEFF${csv}`);
  }

  @Get(':id')
  @RequirePermission('sale.view')
  get(@Req() req: any, @Param('id') id: string): any {
    return this.service.get(req.user.tenantId, id);
  }

  @Post()
  @RequirePermission('sale.create')
  create(@Req() req: any, @Body() body: any): any {
    return this.service.create(req.user.tenantId, req.user.sub, req.user.role, body);
  }

  @Patch(':id')
  @RequirePermission('sale.create')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any): any {
    return this.service.update(req.user.tenantId, req.user.role, id, body);
  }

  @Post(':id/status')
  @RequirePermission('sale.create')
  status(@Req() req: any, @Param('id') id: string, @Body() body: any): any {
    return this.service.changeStatus(req.user.tenantId, req.user.sub, req.user.role, id, body.status);
  }

  @Post(':id/to-document')
  @RequirePermission('document.create')
  toDocument(@Req() req: any, @Param('id') id: string, @Body() body: any): any {
    return this.service.convertToDocument(req.user.tenantId, req.user.sub, req.user.role, id, body);
  }
}
