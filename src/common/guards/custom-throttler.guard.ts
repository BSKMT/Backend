import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

/**
 * Rate Limiting Granular por Endpoint
 * 
 * Configuración recomendada:
 * - Login: 5 intentos / 15 minutos por IP
 * - Registro: 3 intentos / 1 hora por IP  
 * - Reset Password: 3 intentos / 1 hora por IP
 * - Resend Verification: 2 intentos / 1 hora por IP
 * - API autenticada: 300 req/minuto por usuario
 * - API pública: 30 req/minuto por IP
 */

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Usar userId si está autenticado, sino usar IP
    if (req.user?.userId) {
      return `user:${req.user.userId}`;
    }
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }

  protected errorMessage = 'Demasiadas solicitudes. Por favor intenta más tarde.';
}
