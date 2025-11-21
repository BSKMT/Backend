import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './entities/audit-log.schema';

export interface CreateAuditLogDto {
  userId: string;
  email?: string;
  action: string;
  status: 'success' | 'failure' | 'pending';
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  errorMessage?: string;
  sessionId?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  /**
   * Crear log de auditoría
   */
  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      await this.auditLogModel.create({
        ...dto,
        timestamp: new Date(),
      });

      this.logger.debug(`Audit log created: ${dto.action} - ${dto.status} - User: ${dto.userId}`);
    } catch (error) {
      // No lanzar error para no interrumpir el flujo principal
      this.logger.error(`Failed to create audit log: ${error}`);
    }
  }

  /**
   * Registrar intento de login exitoso
   */
  async logLoginSuccess(
    userId: string,
    email: string,
    ipAddress: string,
    userAgent: string,
    sessionId: string,
  ): Promise<void> {
    await this.log({
      userId,
      email,
      action: 'login',
      status: 'success',
      ipAddress,
      userAgent,
      sessionId,
    });
  }

  /**
   * Registrar intento de login fallido
   */
  async logLoginFailure(
    email: string,
    ipAddress: string,
    userAgent: string,
    reason: string,
  ): Promise<void> {
    await this.log({
      userId: 'unknown',
      email,
      action: 'login',
      status: 'failure',
      ipAddress,
      userAgent,
      errorMessage: reason,
    });
  }

  /**
   * Registrar logout
   */
  async logLogout(
    userId: string,
    email: string,
    ipAddress: string,
    userAgent: string,
    sessionId?: string,
  ): Promise<void> {
    await this.log({
      userId,
      email,
      action: 'logout',
      status: 'success',
      ipAddress,
      userAgent,
      sessionId,
    });
  }

  /**
   * Registrar nuevo registro de usuario
   */
  async logRegister(
    userId: string,
    email: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    await this.log({
      userId,
      email,
      action: 'register',
      status: 'success',
      ipAddress,
      userAgent,
    });
  }

  /**
   * Registrar cambio de contraseña
   */
  async logPasswordChange(
    userId: string,
    email: string,
    ipAddress: string,
    userAgent: string,
    method: 'reset' | 'change' = 'change',
  ): Promise<void> {
    await this.log({
      userId,
      email,
      action: 'password-change',
      status: 'success',
      ipAddress,
      userAgent,
      metadata: { method },
    });
  }

  /**
   * Registrar solicitud de reset de contraseña
   */
  async logPasswordResetRequest(
    userId: string,
    email: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    await this.log({
      userId,
      email,
      action: 'password-reset-request',
      status: 'success',
      ipAddress,
      userAgent,
    });
  }

  /**
   * Registrar verificación de email
   */
  async logEmailVerification(
    userId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log({
      userId,
      email,
      action: 'email-verification',
      status: 'success',
      ipAddress,
      userAgent,
    });
  }

  /**
   * Registrar revocación de sesión
   */
  async logSessionRevocation(
    userId: string,
    email: string,
    reason: string,
    sessionId?: string,
  ): Promise<void> {
    await this.log({
      userId,
      email,
      action: 'session-revocation',
      status: 'success',
      sessionId,
      metadata: { reason },
    });
  }

  /**
   * Registrar evento de seguridad
   */
  async logSecurityEvent(
    userId: string,
    email: string,
    eventType: string,
    ipAddress: string,
    userAgent: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.log({
      userId,
      email,
      action: `security-${eventType}`,
      status: 'success',
      ipAddress,
      userAgent,
      metadata,
    });
  }

  /**
   * Obtener logs de un usuario
   */
  async getUserLogs(userId: string, limit = 50): Promise<AuditLogDocument[]> {
    return this.auditLogModel
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Obtener logs por acción
   */
  async getLogsByAction(action: string, limit = 100): Promise<AuditLogDocument[]> {
    return this.auditLogModel
      .find({ action })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Obtener intentos de login fallidos recientes
   */
  async getRecentFailedLogins(hours = 24): Promise<AuditLogDocument[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.auditLogModel
      .find({
        action: 'login',
        status: 'failure',
        timestamp: { $gte: since },
      })
      .sort({ timestamp: -1 })
      .exec();
  }

  /**
   * Obtener estadísticas de seguridad
   */
  async getSecurityStats(hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [totalLogins, failedLogins, passwordResets, newRegistrations] = await Promise.all([
      this.auditLogModel.countDocuments({
        action: 'login',
        status: 'success',
        timestamp: { $gte: since },
      }),
      this.auditLogModel.countDocuments({
        action: 'login',
        status: 'failure',
        timestamp: { $gte: since },
      }),
      this.auditLogModel.countDocuments({
        action: 'password-reset-request',
        timestamp: { $gte: since },
      }),
      this.auditLogModel.countDocuments({
        action: 'register',
        timestamp: { $gte: since },
      }),
    ]);

    return {
      period: `Last ${hours} hours`,
      totalLogins,
      failedLogins,
      successRate: totalLogins > 0 ? ((totalLogins / (totalLogins + failedLogins)) * 100).toFixed(2) + '%' : 'N/A',
      passwordResets,
      newRegistrations,
    };
  }
}
