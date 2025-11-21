import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly CSRF_COOKIE_NAME = 'XSRF-TOKEN';
  private readonly CSRF_HEADER_NAME = 'x-csrf-token';

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Verificar si la ruta está marcada como pública
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const isMutationMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);

    if (!isMutationMethod) {
      return true;
    }

    const csrfCookie = request.cookies[this.CSRF_COOKIE_NAME];
    const csrfHeader = request.headers[this.CSRF_HEADER_NAME] as string;

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      throw new ForbiddenException('Invalid or missing CSRF token');
    }

    return true;
  }
}
