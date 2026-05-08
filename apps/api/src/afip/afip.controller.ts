import { Controller, Get, Post, Put, Delete, Body, UseGuards, Req } from '@nestjs/common'
import { AfipService } from './afip.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('afip')
@UseGuards(JwtAuthGuard)
export class AfipController {
  constructor(private readonly afipService: AfipService) {}

  @Get('credential')
  async getCredential(@Req() req: any) {
    const tenantId = req.user?.tenantId
    return this.afipService.getCredential(tenantId)
  }

  @Post('credential')
  async createCredential(@Req() req: any, @Body() data: any) {
    const tenantId = req.user?.tenantId
    return this.afipService.createCredential(tenantId, data)
  }

  @Put('credential')
  async updateCredential(@Req() req: any, @Body() data: any) {
    const tenantId = req.user?.tenantId
    return this.afipService.updateCredential(tenantId, data)
  }

  @Delete('credential')
  async deleteCredential(@Req() req: any) {
    const tenantId = req.user?.tenantId
    return this.afipService.deleteCredential(tenantId)
  }

  @Get('test-connection')
  async testConnection(@Req() req: any) {
    const tenantId = req.user?.tenantId
    return this.afipService.testConnection(tenantId)
  }
}
