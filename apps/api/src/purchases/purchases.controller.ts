import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common'
import { PurchasesService } from './purchases.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RequirePermission } from '../permissions/decorators/require-permission.decorator'
import { RequirePermissionGuard } from '../permissions/guards/require-permission.guard'

@Controller('purchases')
@UseGuards(JwtAuthGuard, RequirePermissionGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get()
  @RequirePermission('purchase.view')
  async findAll(@Req() req: any) {
    const tenantId = req.user?.tenantId
    return this.purchasesService.findAll(tenantId, req.query)
  }

  // Receptions
  @Get('receptions')
  @RequirePermission('purchase.view')
  async getReceptions(@Req() req: any) {
    const tenantId = req.user?.tenantId
    return this.purchasesService.getReceptions(tenantId, req.query.purchaseOrderId)
  }

  @Get('receptions/:id')
  @RequirePermission('purchase.view')
  async getReceptionById(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.tenantId
    return this.purchasesService.getReceptionById(id, tenantId)
  }

  @Post('receptions')
  @RequirePermission('purchase.receive')
  async createReception(@Req() req: any, @Body() data: any) {
    const tenantId = req.user?.tenantId
    const userId = req.user?.id ?? req.user?.sub
    return this.purchasesService.createReception(tenantId, data, userId)
  }

  @Get(':id')
  @RequirePermission('purchase.view')
  async findById(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.tenantId
    return this.purchasesService.findById(id, tenantId)
  }

  @Post()
  @RequirePermission('purchase.create')
  async create(@Req() req: any, @Body() data: any) {
    const tenantId = req.user?.tenantId
    const userId = req.user?.id ?? req.user?.sub
    return this.purchasesService.create(tenantId, data, userId)
  }

  @Put(':id')
  @RequirePermission('purchase.edit')
  async update(@Param('id') id: string, @Req() req: any, @Body() data: any) {
    const tenantId = req.user?.tenantId
    return this.purchasesService.update(id, tenantId, data)
  }

  @Patch(':id')
  @RequirePermission('purchase.edit')
  async updatePatch(@Param('id') id: string, @Req() req: any, @Body() data: any) {
    const tenantId = req.user?.tenantId
    return this.purchasesService.update(id, tenantId, data)
  }

  @Delete(':id/cancel')
  @RequirePermission('purchase.cancel')
  async cancel(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.tenantId
    return this.purchasesService.cancel(id, tenantId)
  }

  @Post(':id/cancel')
  @RequirePermission('purchase.cancel')
  async cancelPost(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.tenantId
    return this.purchasesService.cancel(id, tenantId)
  }
}
