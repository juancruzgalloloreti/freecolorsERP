import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PermissionsService } from '../permissions.service'
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator'

@Injectable()
export class RequirePermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<string[]>(
      REQUIRE_PERMISSION_KEY,
      context.getHandler(),
    )

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user) {
      throw new ForbiddenException('User not authenticated')
    }

    // OWNER has all permissions
    if (user.role === 'OWNER') {
      return true
    }

    const userId = user.id ?? user.sub

    if (!userId) {
      throw new ForbiddenException('User identity is missing')
    }

    // Check if user has any of the required permissions
    for (const permission of requiredPermissions) {
      const hasPermission = await this.permissionsService.hasPermission(userId, permission)
      if (hasPermission) {
        return true
      }
    }

    throw new ForbiddenException(
      `You do not have the required permissions: ${requiredPermissions.join(', ')}`
    )
  }
}
