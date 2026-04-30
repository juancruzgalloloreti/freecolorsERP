import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StockService } from './stock.service';

@UseGuards(JwtAuthGuard)
@Controller('stock')
export class StockController {
  constructor(private readonly service: StockService) {}
  @Get() current(@Req() req: any, @Query() query: any) { return this.service.current(req.user.tenantId, req.user.role, query); }
  @Get('movements') movements(@Req() req: any, @Query() query: any) { return this.service.movements(req.user.tenantId, req.user.role, query); }
  @Post('movements') record(@Req() req: any, @Body() body: any) { return this.service.record(req.user.tenantId, req.user.sub, req.user.role, body); }
  @Get('deposits') deposits(@Req() req: any) { return this.service.deposits(req.user.tenantId); }
}


