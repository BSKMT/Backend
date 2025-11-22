import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

export interface SessionData {
  userId: string;
  accessToken: string;
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
  deviceName?: string;
  location?: string;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) {}

  async onModuleDestroy() {
    try {
      await this.redisClient.quit();
    } catch (error) {
      // Ignore errors on shutdown (mock client)
    }
  }

  /**
   * Guardar sesión en Redis
   */
  async setSession(sessionId: string, data: SessionData, ttlSeconds: number): Promise<void> {
    const key = `session:${sessionId}`;
    await this.redisClient.setex(key, ttlSeconds, JSON.stringify(data));
  }

  /**
   * Obtener sesión desde Redis
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    const key = `session:${sessionId}`;
    const data = await this.redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Eliminar sesión de Redis
   */
  async deleteSession(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await this.redisClient.del(key);
  }

  /**
   * Obtener todas las sesiones activas de un usuario
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    const pattern = 'session:*';
    const keys = await this.redisClient.keys(pattern);
    const sessions: SessionData[] = [];

    for (const key of keys) {
      const data = await this.redisClient.get(key);
      if (data) {
        const session = JSON.parse(data);
        if (session.userId === userId) {
          sessions.push(session);
        }
      }
    }

    return sessions;
  }

  /**
   * Revocar todas las sesiones de un usuario
   */
  async revokeAllUserSessions(userId: string): Promise<number> {
    const sessions = await this.getUserSessions(userId);
    let revokedCount = 0;

    for (const session of sessions) {
      const sessionId = this.extractSessionId(session.accessToken);
      if (sessionId) {
        await this.deleteSession(sessionId);
        revokedCount++;
      }
    }

    return revokedCount;
  }

  /**
   * Actualizar TTL de una sesión (renovar)
   */
  async renewSession(sessionId: string, ttlSeconds: number): Promise<void> {
    const key = `session:${sessionId}`;
    await this.redisClient.expire(key, ttlSeconds);
  }

  /**
   * Verificar si una sesión existe
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    const key = `session:${sessionId}`;
    const exists = await this.redisClient.exists(key);
    return exists === 1;
  }

  /**
   * Guardar datos genéricos con TTL
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redisClient.setex(key, ttlSeconds, value);
    } else {
      await this.redisClient.set(key, value);
    }
  }

  /**
   * Obtener datos genéricos
   */
  async get(key: string): Promise<string | null> {
    return await this.redisClient.get(key);
  }

  /**
   * Eliminar datos genéricos
   */
  async del(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  /**
   * Incrementar contador con TTL
   */
  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const value = await this.redisClient.incr(key);
    if (ttlSeconds && value === 1) {
      await this.redisClient.expire(key, ttlSeconds);
    }
    return value;
  }

  /**
   * Obtener información del servidor Redis
   */
  async getInfo(): Promise<string> {
    return await this.redisClient.info();
  }

  /**
   * Extraer ID de sesión del token (helper)
   */
  private extractSessionId(token: string): string | null {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return payload.jti || payload.sub;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Rate limiting: incrementar contador de intentos
   */
  async incrementRateLimit(identifier: string, windowSeconds: number): Promise<number> {
    const key = `ratelimit:${identifier}`;
    return await this.incr(key, windowSeconds);
  }

  /**
   * Rate limiting: verificar si excedió el límite
   */
  async checkRateLimit(identifier: string, maxAttempts: number, windowSeconds: number): Promise<boolean> {
    const count = await this.incrementRateLimit(identifier, windowSeconds);
    return count > maxAttempts;
  }
}
