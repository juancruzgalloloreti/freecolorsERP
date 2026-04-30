import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CustomersService } from './customers.service';

@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}
  @Get() findAll(@Req() req: any, @Query() query: any) { return this.service.findAll(req.user.tenantId, query); }
  @Get('export')
  async exportCustomers(@Req() req: any, @Res() res: any): Promise<any> {
    const csv = await this.service.exportCustomers(req.user.tenantId, req.user.role);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="clientes-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send(`\uFEFF${csv}`);
  }
  @Get(':id/account') account(@Req() req: any, @Param('id') id: string, @Query() query: any) { return this.service.account(req.user.tenantId, id, query); }
  @Post() create(@Req() req: any, @Body() body: any) { return this.service.create(req.user.tenantId, req.user.role, body); }
  @Post('import') importCustomers(@Req() req: any, @Body() body: any) { return this.service.importCustomers(req.user.tenantId, req.user.role, body.rows); }
  @Patch(':id') update(@Req() req: any, @Param('id') id: string, @Body() body: any) { return this.service.update(req.user.tenantId, req.user.role, id, body); }
  @Delete(':id') remove(@Req() req: any, @Param('id') id: string) { return this.service.remove(req.user.tenantId, req.user.role, id); }
}


