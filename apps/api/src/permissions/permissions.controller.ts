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
  async getUserPermissions(@Param('userId') userId: string) {
    return this.permissionsService.getUserPermissions(userId)
  }

  @Post('user/:userId/grant/:permissionId')
  @RequirePermission('user.manage_permissions')
  async grantPermissionToUser(
    @Param('userId') userId: string,
    @Param('permissionId') permissionId: string
  ) {
    return this.permissionsService.grantPermissionToUser(userId, permissionId)
  }

  @Delete('user/:userId/revoke/:permissionId')
  @RequirePermission('user.manage_permissions')
  async revokePermissionFromUser(
    @Param('userId') userId: string,
    @Param('permissionId') permissionId: string
  ) {
    return this.permissionsService.revokePermissionFromUser(userId, permissionId)
  }

  @Put('user/:userId/sync')
  @RequirePermission('user.manage_permissions')
  async syncUserPermissions(
    @Param('userId') userId: string,
    @Body() data: { permissionCodes: string[] }
  ) {
    return this.permissionsService.syncUserPermissions(userId, data.permissionCodes)
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
