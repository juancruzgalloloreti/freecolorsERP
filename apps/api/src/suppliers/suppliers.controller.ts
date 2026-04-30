import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuppliersService } from './suppliers.service';

@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}
  @Get() findAll(@Req() req: any, @Query() query: any) { return this.service.findAll(req.user.tenantId, query); }
  @Get(':id/account') account(@Req() req: any, @Param('id') id: string) { return this.service.account(req.user.tenantId, id); }
  @Get(':id/products') products(@Req() req: any, @Param('id') id: string) { return this.service.products(req.user.tenantId, id); }
  @Post() create(@Req() req: any, @Body() body: any) { return this.service.create(req.user.tenantId, req.user.role, body); }
  @Post(':id/products') upsertProduct(@Req() req: any, @Param('id') id: string, @Body() body: any) { return this.service.upsertProduct(req.user.tenantId, req.user.role, id, body); }
  @Patch(':id') update(@Req() req: any, @Param('id') id: string, @Body() body: any) { return this.service.update(req.user.tenantId, req.user.role, id, body); }
  @Delete(':id') remove(@Req() req: any, @Param('id') id: string) { return this.service.remove(req.user.tenantId, req.user.role, id); }
}


