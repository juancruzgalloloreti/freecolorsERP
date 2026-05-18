import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissionGuard } from '../permissions/guards/require-permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@UseGuards(JwtAuthGuard, RequirePermissionGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  @RequirePermission('customers.list')
  findAll(@Req() req: any, @Query() query: any) { return this.service.findAll(req.user.tenantId, query); }

  @Get('export')
  async exportCustomers(@Req() req: any, @Res() res: any): Promise<any> {
    const csv = await this.service.exportCustomers(req.user.tenantId, req.user.role);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="clientes-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send(`\uFEFF${csv}`);
  }

  @Get(':id/account')
  @RequirePermission('customers.list')
  account(@Req() req: any, @Param('id') id: string, @Query() query: any) { return this.service.account(req.user.tenantId, id, query); }

  @Post()
  @RequirePermission('customers.create')
  create(@Req() req: any, @Body() dto: CreateCustomerDto) { return this.service.create(req.user.tenantId, req.user.role, dto); }

  @Post('import')
  @RequirePermission('customers.manage')
  importCustomers(@Req() req: any, @Body() body: any) { return this.service.importCustomers(req.user.tenantId, req.user.role, body.rows); }

  @Patch(':id')
  @RequirePermission('customers.update')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCustomerDto) { return this.service.update(req.user.tenantId, req.user.role, id, dto); }

  @Delete(':id')
  @RequirePermission('customers.delete')
  remove(@Req() req: any, @Param('id') id: string) { return this.service.remove(req.user.tenantId, req.user.role, id); }
}
