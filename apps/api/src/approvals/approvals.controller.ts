import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common'
import { ApprovalsService } from './approvals.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RequirePermission } from '../permissions/decorators/require-permission.decorator'
import { RequirePermissionGuard } from '../permissions/guards/require-permission.guard'

@Controller('approvals')
@UseGuards(JwtAuthGuard, RequirePermissionGuard)
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  // Flows
  @Get('flows')
  @RequirePermission('approval.view')
  async findFlows(@Req() req: any) {
    const tenantId = req.user?.tenantId
    return this.approvalsService.findFlows(tenantId, req.query.entityType as string)
  }

  @Get('flows/:id')
  @RequirePermission('approval.view')
  async findFlowById(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.tenantId
    return this.approvalsService.findFlowById(id, tenantId)
  }

  @Post('flows')
  @RequirePermission('approval.manage')
  async createFlow(@Req() req: any, @Body() data: any) {
    const tenantId = req.user?.tenantId
    return this.approvalsService.createFlow(tenantId, data)
  }

  @Put('flows/:id')
  @RequirePermission('approval.manage')
  async updateFlow(@Param('id') id: string, @Req() req: any, @Body() data: any) {
    const tenantId = req.user?.tenantId
    return this.approvalsService.updateFlow(id, tenantId, data)
  }

  @Delete('flows/:id')
  @RequirePermission('approval.manage')
  async deleteFlow(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.tenantId
    return this.approvalsService.deleteFlow(id, tenantId)
  }

  // Requests
  @Get('requests')
  @RequirePermission('approval.view')
  async findRequests(@Req() req: any) {
    const tenantId = req.user?.tenantId
    return this.approvalsService.findRequests(tenantId, req.query)
  }

  @Get('requests/:id')
  @RequirePermission('approval.view')
  async findRequestById(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.tenantId
    return this.approvalsService.findRequestById(id, tenantId)
  }

  @Post('requests')
  @RequirePermission('approval.manage')
  async createRequest(@Req() req: any, @Body() data: any) {
    const tenantId = req.user?.tenantId
    const userId = req.user?.id ?? req.user?.sub
    return this.approvalsService.createRequest(tenantId, { ...data, requestedById: userId })
  }

  @Post('requests/:id/decisions')
  @RequirePermission('approval.decide')
  async createDecision(@Param('id') id: string, @Req() req: any, @Body() data: any) {
    const tenantId = req.user?.tenantId
    const userId = req.user?.id ?? req.user?.sub
    return this.approvalsService.createDecision(tenantId, id, { ...data, userId })
  }

  @Post('requests/:id/cancel')
  @RequirePermission('approval.manage')
  async cancelRequest(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.tenantId
    return this.approvalsService.cancelRequest(tenantId, id)
  }
}
