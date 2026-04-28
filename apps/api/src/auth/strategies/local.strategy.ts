import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email', passReqToCallback: false });
  }

  async validate(email: string, password: string) {
    // tenantSlug viene en el body pero LocalStrategy no lo pasa directamente
    // Usamos el AuthController directamente para el login
    return null;
  }
}
