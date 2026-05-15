import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  email: string;
  role: string;
}

const REFRESH_TOKEN_DAYS = 30;
const REFRESH_TOKEN_EXPIRY_MS = REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async validateUser(
    email: string,
    password: string,
    tenantSlug: string,
  ): Promise<{ user: any; tenant: any }> {
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
    const accessToken = await this.generateAccessToken({ sub: userId, tenantId, email, role });
    const familyId = randomBytes(16).toString('hex');
    const refreshToken = this.generateRefreshToken();
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

    await this.prisma.$transaction([
      this.prisma.refreshToken.create({
        data: { familyId, tokenHash, userId, expiresAt },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { lastLoginAt: new Date() },
      }),
    ]);

    return { accessToken, refreshToken, expiresAt };
  }

  async refresh(userId: string, rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);

    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!token) throw new UnauthorizedException('Sesión expirada');

    if (token.revokedAt) {
      // Reuse detection: si llega un token ya revocado, es señal de posible robo.
      // Revocar toda la familia de tokens para forzar re-login en todos los dispositivos.
      await this.prisma.refreshToken.updateMany({
        where: { familyId: token.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Sesión inválida. Iniciá sesión nuevamente.');
    }

    if (token.expiresAt < new Date()) {
      throw new UnauthorizedException('Sesión expirada, iniciá sesión nuevamente');
    }

    if (token.userId !== userId) {
      throw new UnauthorizedException('Token inválido');
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { id: token.user.tenantId, isActive: true },
    });
    if (!tenant) throw new UnauthorizedException('Tenant inactivo');

    return this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: token.id },
        data: { revokedAt: new Date() },
      });

      const familyId = token.familyId;
      const newRefreshToken = this.generateRefreshToken();
      const newTokenHash = this.hashToken(newRefreshToken);
      const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

      await tx.refreshToken.create({
        data: { familyId, tokenHash: newTokenHash, userId: token.userId, expiresAt: newExpiresAt },
      });

      return {
        accessToken: await this.generateAccessToken({
          sub: token.userId,
          tenantId: token.user.tenantId,
          email: token.user.email,
          role: token.user.role,
        }),
        refreshToken: newRefreshToken,
        expiresAt: newExpiresAt,
      };
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Contraseña actual incorrecta');

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { revokedAt: new Date() },
      }),
    ]);

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

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { revokedAt: new Date() },
      }),
    ]);

    return {
      id: target.id,
      email: target.email,
      firstName: target.firstName,
      lastName: target.lastName,
      role: target.role,
      isActive: false,
      lastLoginAt: target.lastLoginAt,
      createdAt: target.createdAt,
    };
  }

  private assertOwner(role: string) {
    if (role !== 'OWNER') {
      throw new ForbiddenException('Solo el owner puede administrar usuarios');
    }
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });
  }

  private generateAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwt.signAsync(payload);
  }

  private generateRefreshToken(): string {
    return randomBytes(64).toString('hex');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}