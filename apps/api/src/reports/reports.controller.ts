import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { RequirePermissionGuard } from '../permissions/guards/require-permission.guard';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard, RequirePermissionGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}
  @RequirePermission('report.view')
  @Get() findAll(@Req() req: any) { return this.service.findAll(req.user.tenantId); }
  @RequirePermission('report.view')
  @Get('sales-summary') salesSummary(@Req() req: any, @Query() query: any) {
    return this.service.salesSummary(req.user.tenantId, query);
  }
  @RequirePermission('report.view')
  @Get('management') management(@Req() req: any, @Query() query: any) {
    return this.service.management(req.user.tenantId, query);
  }
  @RequirePermission('report.view')
  @Get('sales') sales(@Req() req: any, @Query() query: any) {
    return this.service.sales(req.user.tenantId, query);
  }
  @RequirePermission('report.view')
  @Get('stock') stock(@Req() req: any) {
    return this.service.stock(req.user.tenantId);
  }
}


