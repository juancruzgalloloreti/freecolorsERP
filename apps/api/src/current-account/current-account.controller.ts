import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { RequirePermissionGuard } from '../permissions/guards/require-permission.guard';
import { CurrentAccountService } from './current-account.service';

@UseGuards(JwtAuthGuard, RequirePermissionGuard)
@Controller('currentAccount')
export class CurrentAccountController {
  constructor(private readonly service: CurrentAccountService) {}
  @RequirePermission('customer.credit_limit')
  @Get() findAll(@Req() req: any, @Query() query: any) { return this.service.findAll(req.user.tenantId, query); }
  @RequirePermission('customer.credit_limit')
  @Post('entries') addEntry(@Req() req: any, @Body() body: any) { return this.service.addEntry(req.user.tenantId, req.user.sub, req.user.role, body); }
}


