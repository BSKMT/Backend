import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Guard para verificar que el usuario tenga su email verificado
 * Uso: @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
 * Para desactivar en rutas específicas: @SkipEmailVerification()
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Verificar si la ruta tiene el decorador @SkipEmailVerification()
    const skipVerification = this.reflector.getAllAndOverride<boolean>('skipEmailVerification', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipVerification) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    if (!user.emailVerified) {
      throw new ForbiddenException(
        'Debes verificar tu email antes de acceder a este recurso. Revisa tu bandeja de entrada.'
      );
    }

    return true;
  }
}
