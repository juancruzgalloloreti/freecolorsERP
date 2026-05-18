import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissionGuard } from '../permissions/guards/require-permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { StockService } from './stock.service';
import { CreateMovementDto } from './dto/create-movement.dto';

@UseGuards(JwtAuthGuard, RequirePermissionGuard)
@Controller('stock')
export class StockController {
  constructor(private readonly service: StockService) {}

  @Get()
  @RequirePermission('stock.view')
  current(@Req() req: any, @Query() query: any) { return this.service.current(req.user.tenantId, req.user.role, query); }

  @Get('movements')
  @RequirePermission('stock.view')
  movements(@Req() req: any, @Query() query: any) { return this.service.movements(req.user.tenantId, req.user.role, query); }

  @Post('movements')
  @RequirePermission('stock.adjust')
  record(@Req() req: any, @Body() dto: CreateMovementDto) { return this.service.record(req.user.tenantId, req.user.sub, req.user.role, dto); }

  @Get('deposits')
  deposits(@Req() req: any) { return this.service.deposits(req.user.tenantId); }
}
