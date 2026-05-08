import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common'
import { ChecksService } from './checks.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RequirePermission } from '../permissions/decorators/require-permission.decorator'
import { RequirePermissionGuard } from '../permissions/guards/require-permission.guard'

@Controller('checks')
@UseGuards(JwtAuthGuard, RequirePermissionGuard)
export class ChecksController {
  constructor(private readonly checksService: ChecksService) {}

  @Get()
  @RequirePermission('check.view')
  async findAll(@Req() req: any) {
    const tenantId = req.user?.tenantId
    return this.checksService.findAll(tenantId, req.query)
  }

  @Get('summary')
  @RequirePermission('check.view')
  async getSummary(@Req() req: any) {
    const tenantId = req.user?.tenantId
    return this.checksService.getSummary(tenantId)
  }

  @Get(':id')
  @RequirePermission('check.view')
  async findById(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.tenantId
    return this.checksService.findById(id, tenantId)
  }

  @Post()
  @RequirePermission('check.manage')
  async create(@Req() req: any, @Body() data: any) {
    const tenantId = req.user?.tenantId
    return this.checksService.create(tenantId, data)
  }

  @Post(':id/deposit')
  @RequirePermission('check.manage')
  async deposit(@Param('id') id: string, @Req() req: any, @Body() data: any) {
    const tenantId = req.user?.tenantId
    return this.checksService.deposit(id, tenantId, data)
  }

  @Post(':id/clear')
  @RequirePermission('check.manage')
  async clear(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.tenantId
    return this.checksService.clear(id, tenantId)
  }

  @Post(':id/bounce')
  @RequirePermission('check.manage')
  async bounce(@Param('id') id: string, @Req() req: any, @Body() data: any) {
    const tenantId = req.user?.tenantId
    return this.checksService.bounce(id, tenantId, data)
  }

  @Post(':id/endorse')
  @RequirePermission('check.manage')
  async endorse(@Param('id') id: string, @Req() req: any, @Body() data: any) {
    const tenantId = req.user?.tenantId
    return this.checksService.endorse(id, tenantId, data)
  }

  @Post(':id/cancel')
  @RequirePermission('check.manage')
  async cancel(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.tenantId
    return this.checksService.cancel(id, tenantId)
  }
}
