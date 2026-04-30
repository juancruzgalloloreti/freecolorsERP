import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CashService } from './cash.service';

@UseGuards(JwtAuthGuard)
@Controller('cash')
export class CashController {
  constructor(private readonly service: CashService) {}

  @Get('current')
  current(@Req() req: any) {
    return this.service.current(req.user.tenantId);
  }

  @Get('sessions')
  sessions(@Req() req: any) {
    return this.service.list(req.user.tenantId);
  }

  @Post('open')
  open(@Req() req: any, @Body() body: any) {
    return this.service.open(req.user.tenantId, req.user.sub, req.user.role, body);
  }

  @Post('move')
  move(@Req() req: any, @Body() body: any) {
    return this.service.move(req.user.tenantId, req.user.sub, req.user.role, body);
  }

  @Post('close')
  close(@Req() req: any, @Body() body: any) {
    return this.service.close(req.user.tenantId, req.user.sub, req.user.role, body);
  }
}
