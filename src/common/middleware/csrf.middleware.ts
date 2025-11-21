import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly CSRF_TOKEN_LENGTH = 32;
  private readonly CSRF_COOKIE_NAME = 'XSRF-TOKEN';
  private readonly CSRF_HEADER_NAME = 'x-csrf-token';

  use(req: Request, res: Response, next: NextFunction) {
    // Solo aplicar CSRF a métodos de mutación
    const isMutationMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

    // Generar token CSRF si no existe
    let csrfToken = req.cookies[this.CSRF_COOKIE_NAME];
    
    if (!csrfToken) {
      csrfToken = this.generateToken();
      res.cookie(this.CSRF_COOKIE_NAME, csrfToken, {
        httpOnly: false, // Frontend necesita leerlo
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000, // 24 horas
      });
    }

    // Validar token CSRF en métodos de mutación
    if (isMutationMethod) {
      const headerToken = req.headers[this.CSRF_HEADER_NAME] as string;
      
      // Excluir rutas públicas (login, register)
      const isPublicRoute = req.path.includes('/auth/login') || 
                           req.path.includes('/auth/register') ||
                           req.path.includes('/auth/verify-email') ||
                           req.path.includes('/auth/forgot-password') ||
                           req.path.includes('/auth/reset-password');

      if (!isPublicRoute) {
        if (!headerToken || headerToken !== csrfToken) {
          throw new ForbiddenException('Invalid CSRF token');
        }
      }
    }

    next();
  }

  private generateToken(): string {
    return crypto.randomBytes(this.CSRF_TOKEN_LENGTH).toString('hex');
  }
}
