import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}
  @Get() findAll(@Req() req: any) { return this.service.findAll(req.user.tenantId); }
  @Get('sales-summary') salesSummary(@Req() req: any, @Query() query: any) {
    return this.service.salesSummary(req.user.tenantId, query);
  }
  @Get('management') management(@Req() req: any, @Query() query: any) {
    return this.service.management(req.user.tenantId, query);
  }
  @Get('sales') sales(@Req() req: any, @Query() query: any) {
    return this.service.sales(req.user.tenantId, query);
  }
  @Get('stock') stock(@Req() req: any) {
    return this.service.stock(req.user.tenantId);
  }
}


