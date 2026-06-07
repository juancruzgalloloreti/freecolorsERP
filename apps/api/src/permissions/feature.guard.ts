import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../common/prisma.service';

const FEATURE_KEY = 'feature';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<string>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!feature) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException('Usuario no autenticado');
    if (user.role === 'OWNER') return true;

    if (user.role === 'ADMIN') {
      const permission = await this.prisma.employeePermission.findUnique({
        where: { userId_tenantId_feature: { userId: user.id, tenantId: user.tenantId, feature } },
      });
      if (permission === null) return true;
      return permission.enabled;
    }

    const permission = await this.prisma.employeePermission.findUnique({
      where: { userId_tenantId_feature: { userId: user.id, tenantId: user.tenantId, feature } },
    });
    return permission?.enabled ?? false;
  }
}
