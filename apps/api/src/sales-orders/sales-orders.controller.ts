import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SalesOrdersService } from './sales-orders.service';

@UseGuards(JwtAuthGuard)
@Controller('sales-orders')
export class SalesOrdersController {
  constructor(private readonly service: SalesOrdersService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: any): any {
    return this.service.findAll(req.user.tenantId, query);
  }

  @Get('export')
  async export(@Req() req: any, @Res() res: any, @Query() query: any): Promise<any> {
    const csv = await this.service.exportCsv(req.user.tenantId, query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="pedidos-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send(`\uFEFF${csv}`);
  }

  @Get(':id')
  get(@Req() req: any, @Param('id') id: string): any {
    return this.service.get(req.user.tenantId, id);
  }

  @Post()
  create(@Req() req: any, @Body() body: any): any {
    return this.service.create(req.user.tenantId, req.user.sub, req.user.role, body);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any): any {
    return this.service.update(req.user.tenantId, req.user.role, id, body);
  }

  @Post(':id/status')
  status(@Req() req: any, @Param('id') id: string, @Body() body: any): any {
    return this.service.changeStatus(req.user.tenantId, req.user.sub, req.user.role, id, body.status);
  }

  @Post(':id/to-document')
  toDocument(@Req() req: any, @Param('id') id: string, @Body() body: any): any {
    return this.service.convertToDocument(req.user.tenantId, req.user.sub, req.user.role, id, body);
  }
}
