import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common'
import { PermissionsService } from './permissions.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RequirePermission } from './decorators/require-permission.decorator'
import { RequirePermissionGuard } from './guards/require-permission.guard'

@Controller('permissions')
@UseGuards(JwtAuthGuard, RequirePermissionGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('me')
  async getMyPermissions(@Req() req: any) {
    return this.permissionsService.getUserPermissions(req.user.id ?? req.user.sub)
  }

  @Get()
  @RequirePermission('user.manage_permissions')
  async findAll() {
    return this.permissionsService.findAll()
  }

  @Get('category/:category')
  @RequirePermission('user.manage_permissions')
  async findByCategory(@Param('category') category: string) {
    return this.permissionsService.findByCategory(category)
  }

  @Get('user/:userId')
  @RequirePermission('user.manage_permissions')
  async getUserPermissions(@Req() req: any, @Param('userId') userId: string) {
    return this.permissionsService.getUserPermissions(userId, req.user.tenantId)
  }

  @Post('user/:userId/grant/:permissionId')
  @RequirePermission('user.manage_permissions')
  async grantPermissionToUser(
    @Req() req: any,
    @Param('userId') userId: string,
    @Param('permissionId') permissionId: string
  ) {
    return this.permissionsService.grantPermissionToUser(req.user.tenantId, userId, permissionId, req.user.sub, req.user.role)
  }

  @Delete('user/:userId/revoke/:permissionId')
  @RequirePermission('user.manage_permissions')
  async revokePermissionFromUser(
    @Req() req: any,
    @Param('userId') userId: string,
    @Param('permissionId') permissionId: string
  ) {
    return this.permissionsService.revokePermissionFromUser(req.user.tenantId, userId, permissionId, req.user.sub, req.user.role)
  }

  @Put('user/:userId/sync')
  @RequirePermission('user.manage_permissions')
  async syncUserPermissions(
    @Req() req: any,
    @Param('userId') userId: string,
    @Body() data: { permissionCodes: string[] }
  ) {
    return this.permissionsService.syncUserPermissions(req.user.tenantId, userId, data.permissionCodes, req.user.sub, req.user.role)
  }

  @Post('seed')
  @RequirePermission('user.manage_permissions')
  async seedDefaultPermissions() {
    return this.permissionsService.seedDefaultPermissions()
  }

  @Get(':id')
  @RequirePermission('user.manage_permissions')
  async findById(@Param('id') id: string) {
    return this.permissionsService.findById(id)
  }

  @Post()
  @RequirePermission('user.manage_permissions')
  async create(@Body() data: { code: string; description: string; category: string }) {
    return this.permissionsService.create(data)
  }

  @Put(':id')
  @RequirePermission('user.manage_permissions')
  async update(
    @Param('id') id: string,
    @Body() data: { description?: string; category?: string }
  ) {
    return this.permissionsService.update(id, data)
  }

  @Delete(':id')
  @RequirePermission('user.manage_permissions')
  async remove(@Param('id') id: string) {
    return this.permissionsService.remove(id)
  }
}
