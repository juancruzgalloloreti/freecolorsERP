import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { RequirePermissionGuard } from '../permissions/guards/require-permission.guard';
import { AuditService } from './audit.service';

@UseGuards(JwtAuthGuard, RequirePermissionGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  @RequirePermission('audit.read')
  list(@Req() req: any, @Query() query: any) {
    return this.service.list(req.user.tenantId, query);
  }
}
