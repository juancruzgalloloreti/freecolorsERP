import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { RequirePermissionGuard } from '../permissions/guards/require-permission.guard';
import { CashService } from './cash.service';

@UseGuards(JwtAuthGuard, RequirePermissionGuard)
@Controller('cash')
export class CashController {
  constructor(private readonly service: CashService) {}

  @Get('current')
  @RequirePermission('cash.open')
  current(@Req() req: any) {
    return this.service.current(req.user.tenantId);
  }

  @Get('sessions')
  @RequirePermission('cash.open')
  sessions(@Req() req: any) {
    return this.service.list(req.user.tenantId);
  }

  @Post('open')
  @RequirePermission('cash.open')
  open(@Req() req: any, @Body() body: any) {
    return this.service.open(req.user.tenantId, req.user.sub, req.user.role, body);
  }

  @Post('move')
  @RequirePermission('cash.move')
  move(@Req() req: any, @Body() body: any) {
    return this.service.move(req.user.tenantId, req.user.sub, req.user.role, body);
  }

  @Post('close')
  @RequirePermission('cash.close')
  close(@Req() req: any, @Body() body: any) {
    return this.service.close(req.user.tenantId, req.user.sub, req.user.role, body);
  }
}
