import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissionGuard } from '../permissions/guards/require-permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@UseGuards(JwtAuthGuard, RequirePermissionGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Get()
  @RequirePermission('suppliers.list')
  findAll(@Req() req: any, @Query() query: any) { return this.service.findAll(req.user.tenantId, query); }

  @Get(':id/account')
  @RequirePermission('suppliers.list')
  account(@Req() req: any, @Param('id') id: string) { return this.service.account(req.user.tenantId, id); }

  @Get(':id/products')
  @RequirePermission('suppliers.list')
  products(@Req() req: any, @Param('id') id: string) { return this.service.products(req.user.tenantId, id); }

  @Post()
  @RequirePermission('suppliers.create')
  create(@Req() req: any, @Body() dto: CreateSupplierDto) { return this.service.create(req.user.tenantId, req.user.role, dto); }

  @Post(':id/products')
  @RequirePermission('suppliers.manage')
  upsertProduct(@Req() req: any, @Param('id') id: string, @Body() body: any) { return this.service.upsertProduct(req.user.tenantId, req.user.role, id, body); }

  @Patch(':id')
  @RequirePermission('suppliers.update')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateSupplierDto) { return this.service.update(req.user.tenantId, req.user.role, id, dto); }

  @Delete(':id')
  @RequirePermission('suppliers.delete')
  remove(@Req() req: any, @Param('id') id: string) { return this.service.remove(req.user.tenantId, req.user.role, id); }
}
