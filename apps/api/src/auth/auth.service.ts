import {
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
