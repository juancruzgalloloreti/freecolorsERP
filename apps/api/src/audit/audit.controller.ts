import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditService } from './audit.service';
import { assertPermission } from '../common/permissions';

@UseGuards(JwtAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  list(@Req() req: any, @Query() query: any) {
    assertPermission(req.user.role, 'audit.read');
    return this.service.list(req.user.tenantId, query);
  }
}
