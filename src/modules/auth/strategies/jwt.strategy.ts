import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Extraer JWT desde cookie httpOnly
          return request?.cookies?.['access_token'];
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(request: Request, payload: any) {
    const token = request?.cookies?.['access_token'];
    
    if (!token) {
      throw new UnauthorizedException('Token no encontrado');
    }

    // Verificar si la sesión está activa
    const isValidSession = await this.authService.validateSession(
      payload.sub,
      token,
    );

    if (!isValidSession) {
      throw new UnauthorizedException('Sesión inválida o expirada');
    }

    // Verificar si el usuario existe y está activo
    const user = await this.authService.getUserById(payload.sub);
    
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      user,
    };
  }
}
