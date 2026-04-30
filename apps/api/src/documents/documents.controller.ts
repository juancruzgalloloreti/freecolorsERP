import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentsService } from './documents.service';

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}
  @Get() findAll(@Req() req: any, @Query() query: any) { return this.service.findAll(req.user.tenantId, query); }
  @Get('puntos-de-venta') puntos(@Req() req: any) { return this.service.puntos(req.user.tenantId); }
  @Get(':id') get(@Req() req: any, @Param('id') id: string) { return this.service.get(req.user.tenantId, id); }
  @Post() create(@Req() req: any, @Body() body: any) { return this.service.create(req.user.tenantId, req.user.sub, req.user.role, body); }
  @Post('confirm-sale') confirmSale(@Req() req: any, @Body() body: any) { return this.service.confirmSale(req.user.tenantId, req.user.sub, req.user.role, body); }
  @Patch(':id') update(@Req() req: any, @Param('id') id: string, @Body() body: any) { return this.service.update(req.user.tenantId, req.user.role, id, body); }
  @Post(':id/confirm') confirm(@Req() req: any, @Param('id') id: string, @Body() body: any) { return this.service.confirm(req.user.tenantId, req.user.sub, req.user.role, id, body); }
  @Patch(':id/confirm') confirmAlias(@Req() req: any, @Param('id') id: string, @Body() body: any) { return this.service.confirm(req.user.tenantId, req.user.sub, req.user.role, id, body); }
  @Post(':id/cancel') cancel(@Req() req: any, @Param('id') id: string, @Body() body: any) { return this.service.cancel(req.user.tenantId, req.user.sub, req.user.role, id, body); }
  @Patch(':id/cancel') cancelAlias(@Req() req: any, @Param('id') id: string, @Body() body: any) { return this.service.cancel(req.user.tenantId, req.user.sub, req.user.role, id, body); }
  @Post(':id/convert') convert(@Req() req: any, @Param('id') id: string, @Body() body: any) { return this.service.convert(req.user.tenantId, req.user.sub, req.user.role, id, body); }
}


