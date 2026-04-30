import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentAccountService } from './current-account.service';

@UseGuards(JwtAuthGuard)
@Controller('currentAccount')
export class CurrentAccountController {
  constructor(private readonly service: CurrentAccountService) {}
  @Get() findAll(@Req() req: any, @Query() query: any) { return this.service.findAll(req.user.tenantId, query); }
  @Post('entries') addEntry(@Req() req: any, @Body() body: any) { return this.service.addEntry(req.user.tenantId, req.user.sub, req.user.role, body); }
}


