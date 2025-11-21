import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Extraer refresh token desde cookie httpOnly
          return request?.cookies?.['refresh_token'];
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(request: Request, payload: any) {
    const refreshToken = request?.cookies?.['refresh_token'];
    
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token no encontrado');
    }

    // Verificar si el refresh token es válido y no ha sido revocado
    const isValid = await this.authService.validateRefreshToken(
      payload.sub,
      refreshToken,
    );

    if (!isValid) {
      throw new UnauthorizedException('Refresh token inválido o revocado');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      refreshToken,
    };
  }
}
