import { Controller, Get, Post, Put, Delete, Body, UseGuards, Req } from '@nestjs/common'
import { AfipService } from './afip.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RequirePermissionGuard } from '../permissions/guards/require-permission.guard'
import { RequirePermission } from '../permissions/decorators/require-permission.decorator'
import { CreateCredentialDto } from './dto/create-credential.dto'
import { UpdateCredentialDto } from './dto/update-credential.dto'

@Controller('afip')
@UseGuards(JwtAuthGuard, RequirePermissionGuard)
export class AfipController {
  constructor(private readonly afipService: AfipService) {}

  @Get('credential')
  @RequirePermission('afip.view')
  async getCredential(@Req() req: any) {
    const tenantId = req.user?.tenantId
    return this.afipService.getCredential(tenantId)
  }

  @Post('credential')
  @RequirePermission('afip.manage')
  async createCredential(@Req() req: any, @Body() dto: CreateCredentialDto) {
    const tenantId = req.user?.tenantId
    return this.afipService.createCredential(tenantId, dto)
  }

  @Put('credential')
  @RequirePermission('afip.manage')
  async updateCredential(@Req() req: any, @Body() dto: UpdateCredentialDto) {
    const tenantId = req.user?.tenantId
    return this.afipService.updateCredential(tenantId, dto)
  }

  @Delete('credential')
  @RequirePermission('afip.manage')
  async deleteCredential(@Req() req: any) {
    const tenantId = req.user?.tenantId
    return this.afipService.deleteCredential(tenantId)
  }

  @Get('test-connection')
  @RequirePermission('afip.view')
  async testConnection(@Req() req: any) {
    const tenantId = req.user?.tenantId
    return this.afipService.testConnection(tenantId)
  }
}
