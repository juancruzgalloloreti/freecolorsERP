import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login con email + password + tenant slug' })
  async login(@Body() dto: LoginDto): Promise<any> {
    const { user, tenant } = await this.authService.validateUser(
      dto.email,
      dto.password,
      dto.tenantSlug,
    );
    const tokens = await this.authService.login(
      user.id,
      tenant.id,
      user.email,
      user.role,
    );
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
      },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener nuevo access token con refresh token' })
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.userId, dto.refreshToken);
  }


  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cambiar contraseña del usuario autenticado' })
  async changePassword(@Req() req: any, @Body() dto: { currentPassword: string; newPassword: string }) {
    return this.authService.changePassword(req.user.sub, dto.currentPassword, dto.newPassword);
  }

  @Get('users')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar usuarios del tenant (owner)' })
  async users(@Req() req: any) {
    return this.authService.listUsers(req.user.role, req.user.tenantId);
  }

  @Post('users')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear usuario del tenant (owner)' })
  async createUser(@Req() req: any, @Body() dto: any) {
    return this.authService.createUser(req.user.role, req.user.tenantId, dto);
  }

  @Patch('users/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar usuario del tenant (owner)' })
  async updateUser(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.authService.updateUser(req.user.role, req.user.tenantId, req.user.sub, id, dto);
  }

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar usuario del tenant (owner)' })
  async deleteUser(@Req() req: any, @Param('id') id: string) {
    return this.authService.deactivateUser(req.user.role, req.user.tenantId, req.user.sub, id);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cerrar sesión (invalida refresh token)' })
  async logout(@Req() req: any) {
    await this.authService.logout(req.user.sub);
  }
}


