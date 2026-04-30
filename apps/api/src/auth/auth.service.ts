import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

export interface JwtPayload {
  sub: string;      // userId
  tenantId: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async validateUser(
    email: string,
    password: string,
    tenantSlug: string,
  ): Promise<{ user: any; tenant: any }> {
    /**
     * BUG FIX: el original usaba findUnique() con { slug, isActive: true }.
     * findUnique() sólo acepta campos de la clave única como filtro primario;
     * agregar isActive puede silenciar el resultado o lanzar error según la
     * versión de Prisma. Usamos findFirst() que acepta cualquier combinación.
     */
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: tenantSlug, isActive: true },
    });
    if (!tenant) throw new UnauthorizedException('Tenant no encontrado o inactivo');

    const user = await this.prisma.user.findUnique({
      where: {
        tenantId_email: { tenantId: tenant.id, email: email.toLowerCase() },
      },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    return { user, tenant };
  }

  async login(
    userId: string,
    tenantId: string,
    email: string,
    role: string,
  ) {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken({ sub: userId, tenantId, email, role }),
      Promise.resolve(this.generateRefreshToken()),
    ]);

    // Guardamos el hash del refresh token (nunca el crudo en DB)
    const hash = await bcrypt.hash(refreshToken, 10);
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: hash,
        refreshTokenExpiry: expiry,
        lastLoginAt: new Date(),
      },
    });

    return { accessToken, refreshToken };
  }

  async refresh(userId: string, rawRefreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.refreshTokenHash || !user.refreshTokenExpiry) {
      throw new UnauthorizedException('Sesión expirada');
    }
    if (user.refreshTokenExpiry < new Date()) {
      throw new UnauthorizedException('Sesión expirada, iniciá sesión nuevamente');
    }

    const valid = await bcrypt.compare(rawRefreshToken, user.refreshTokenHash);
    if (!valid) throw new UnauthorizedException('Token inválido');

    const tenant = await this.prisma.tenant.findFirst({
      where: { id: user.tenantId, isActive: true },
    });
    if (!tenant) throw new UnauthorizedException('Tenant inactivo');

    return this.login(user.id, user.tenantId, user.email, user.role);
  }


  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Contraseña actual incorrecta');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, refreshTokenHash: null, refreshTokenExpiry: null },
    });

    return { ok: true };
  }

  async listUsers(requesterRole: string, tenantId: string) {
    this.assertOwner(requesterRole);
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: [{ isActive: 'desc' }, { firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  async createUser(requesterRole: string, tenantId: string, data: any) {
    this.assertOwner(requesterRole);

    const email = String(data.email || '').trim().toLowerCase();
    const firstName = String(data.firstName || '').trim();
    const lastName = String(data.lastName || '').trim();
    const password = String(data.password || '');
    const role = String(data.role || 'EMPLOYEE').toUpperCase();

    if (!email || !firstName || !lastName || password.length < 8) {
      throw new BadRequestException('Email, nombre, apellido y contraseña de al menos 8 caracteres son requeridos');
    }

    if (!['ADMIN', 'EMPLOYEE', 'READONLY'].includes(role)) {
      throw new BadRequestException('Rol inválido');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    return this.prisma.user.create({
      data: {
        tenantId,
        email,
        firstName,
        lastName,
        role: role as any,
        passwordHash,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async updateUser(requesterRole: string, tenantId: string, requesterId: string, userId: string, data: any) {
    this.assertOwner(requesterRole);

    const target = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!target) throw new BadRequestException('Usuario no encontrado');
    if (target.role === 'OWNER' && requesterId !== userId) {
      throw new ForbiddenException('No se puede editar otro owner');
    }

    const next: any = {};
    if (data.email !== undefined) next.email = String(data.email || '').trim().toLowerCase();
    if (data.firstName !== undefined) next.firstName = String(data.firstName || '').trim();
    if (data.lastName !== undefined) next.lastName = String(data.lastName || '').trim();
    if (data.role !== undefined && target.role !== 'OWNER') {
      const role = String(data.role || '').toUpperCase();
      if (!['ADMIN', 'EMPLOYEE', 'READONLY'].includes(role)) throw new BadRequestException('Rol inválido');
      next.role = role;
    }
    if (data.isActive !== undefined) {
      if (requesterId === userId && data.isActive === false) {
        throw new ForbiddenException('No podés desactivar tu propia cuenta');
      }
      next.isActive = Boolean(data.isActive);
    }
    if (data.password) {
      const password = String(data.password);
      if (password.length < 8) throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');
      next.passwordHash = await bcrypt.hash(password, 12);
      next.refreshTokenHash = null;
      next.refreshTokenExpiry = null;
    }

    if ((next.email !== undefined && !next.email) || (next.firstName !== undefined && !next.firstName) || (next.lastName !== undefined && !next.lastName)) {
      throw new BadRequestException('Email, nombre y apellido son requeridos');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: next,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  async deactivateUser(requesterRole: string, tenantId: string, requesterId: string, userId: string) {
    this.assertOwner(requesterRole);
    if (requesterId === userId) throw new ForbiddenException('No podés desactivar tu propia cuenta');

    const target = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!target) throw new BadRequestException('Usuario no encontrado');
    if (target.role === 'OWNER') throw new ForbiddenException('No se puede desactivar el owner');

    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false, refreshTokenHash: null, refreshTokenExpiry: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  private assertOwner(role: string) {
    if (role !== 'OWNER') {
      throw new ForbiddenException('Solo el owner puede administrar usuarios');
    }
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null, refreshTokenExpiry: null },
    });
  }

  private generateAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwt.signAsync(payload);
  }

  private generateRefreshToken(): string {
    return randomBytes(64).toString('hex');
  }
}


