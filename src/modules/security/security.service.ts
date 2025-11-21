import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SecurityEvent, SecurityEventDocument } from './entities/security-event.schema';
import { User, UserDocument } from '../../common/schemas/user.schema';
import { GeoLocationService, GeoLocation } from './geolocation.service';
import { EmailQueueService } from '../queue/email-queue.service';

interface LoginContext {
  userId: string;
  email: string;
  userName: string;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
}

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  // Umbrales de detección
  private readonly MAX_DISTANCE_KM = 500; // Distancia máxima sin alerta
  private readonly LOCK_THRESHOLD_SCORE = 80; // Score para bloquear cuenta
  private readonly ALERT_THRESHOLD_SCORE = 60; // Score para enviar alerta

  constructor(
    @InjectModel(SecurityEvent.name) private securityEventModel: Model<SecurityEventDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private geoLocationService: GeoLocationService,
    private emailQueueService: EmailQueueService,
  ) {}

  /**
   * Analizar login y detectar actividad sospechosa
   */
  async analyzeLoginAttempt(context: LoginContext): Promise<{
    allowed: boolean;
    riskScore: number;
    requiresAdditionalVerification: boolean;
    alerts: string[];
  }> {
    const alerts: string[] = [];
    let riskScore = 0;

    // 1. Obtener geolocalización de la IP
    const currentLocation = await this.geoLocationService.getLocation(context.ipAddress);

    // 2. Verificar si es una IP nueva
    const isNewIP = await this.isNewIP(context.userId, context.ipAddress);
    if (isNewIP) {
      riskScore += 20;
      alerts.push('Nueva IP detectada');
      
      await this.createSecurityEvent({
        userId: new Types.ObjectId(context.userId),
        eventType: 'new_ip',
        severity: 'medium',
        riskScore: 20,
        ipAddress: context.ipAddress,
        location: currentLocation?.full,
        city: currentLocation?.city,
        country: currentLocation?.country,
        deviceFingerprint: context.deviceFingerprint,
        userAgent: context.userAgent,
        metadata: { isNewIP: true },
      });

      // Enviar alerta de nueva IP
      await this.emailQueueService.sendSecurityAlert(
        context.email,
        context.userName,
        'Inicio de sesión desde nueva IP',
        {
          ip: context.ipAddress,
          location: currentLocation?.full || 'Desconocida',
          timestamp: new Date().toLocaleString('es-CO'),
        }
      );
    }

    // 3. Verificar ubicación sospechosa
    if (currentLocation) {
      const lastLocation = await this.getLastKnownLocation(context.userId);
      
      if (lastLocation) {
        const locationCheck = await this.geoLocationService.isSuspiciousLocation(
          currentLocation,
          lastLocation,
          this.MAX_DISTANCE_KM
        );

        if (locationCheck.suspicious) {
          riskScore += 30;
          alerts.push(`Nueva ubicación muy lejana (${locationCheck.distance} km)`);
          
          await this.createSecurityEvent({
            userId: new Types.ObjectId(context.userId),
            eventType: 'new_location',
            severity: 'high',
            riskScore: 30,
            ipAddress: context.ipAddress,
            location: currentLocation.full,
            city: currentLocation.city,
            country: currentLocation.country,
            deviceFingerprint: context.deviceFingerprint,
            userAgent: context.userAgent,
            metadata: { 
              distance: locationCheck.distance,
              lastLocation: lastLocation.full,
            },
          });

          // Enviar alerta de nueva ubicación
          await this.emailQueueService.sendSecurityAlert(
            context.email,
            context.userName,
            'Inicio de sesión desde nueva ubicación',
            {
              currentLocation: currentLocation.full,
              lastLocation: lastLocation.full,
              distance: `${locationCheck.distance} km`,
              timestamp: new Date().toLocaleString('es-CO'),
            }
          );
        }
      }
    }

    // 4. Verificar patrones de tiempo
    const rapidLoginAttempts = await this.detectRapidLoginAttempts(context.userId);
    if (rapidLoginAttempts) {
      riskScore += 25;
      alerts.push('Múltiples intentos de login en corto tiempo');
      
      await this.createSecurityEvent({
        userId: new Types.ObjectId(context.userId),
        eventType: 'suspicious_login',
        severity: 'high',
        riskScore: 25,
        ipAddress: context.ipAddress,
        location: currentLocation?.full,
        metadata: { rapidAttempts: true },
      });
    }

    // 5. Verificar si la cuenta ya está bloqueada
    const user = await this.userModel.findById(context.userId);
    if (user?.isLocked) {
      return {
        allowed: false,
        riskScore: 100,
        requiresAdditionalVerification: true,
        alerts: ['Cuenta bloqueada por actividad sospechosa'],
      };
    }

    // 6. Decidir acción basada en score
    let allowed = true;
    let requiresAdditionalVerification = false;

    if (riskScore >= this.LOCK_THRESHOLD_SCORE) {
      // Bloquear cuenta temporalmente
      await this.lockAccount(context.userId, '1 hour');
      allowed = false;
      alerts.push('Cuenta bloqueada temporalmente por seguridad');
      
      await this.emailQueueService.sendSecurityAlert(
        context.email,
        context.userName,
        'Cuenta bloqueada por actividad sospechosa',
        {
          reason: alerts.join(', '),
          riskScore,
          timestamp: new Date().toLocaleString('es-CO'),
          unlockTime: '1 hora',
        }
      );
    } else if (riskScore >= this.ALERT_THRESHOLD_SCORE) {
      // Requerir verificación adicional (2FA obligatorio)
      requiresAdditionalVerification = true;
      alerts.push('Se requiere verificación adicional');
    }

    this.logger.log(`Login analysis for user ${context.userId}: Score=${riskScore}, Allowed=${allowed}`);

    return {
      allowed,
      riskScore,
      requiresAdditionalVerification,
      alerts,
    };
  }

  /**
   * Crear evento de seguridad
   */
  private async createSecurityEvent(data: Partial<SecurityEvent>): Promise<void> {
    try {
      await this.securityEventModel.create({
        ...data,
        actionTaken: false,
        reviewed: false,
      });
    } catch (error) {
      this.logger.error('Error creating security event:', error);
    }
  }

  /**
   * Verificar si es una IP nueva para el usuario
   */
  private async isNewIP(userId: string, ipAddress: string): Promise<boolean> {
    const count = await this.securityEventModel.countDocuments({
      userId,
      ipAddress,
    });

    return count === 0;
  }

  /**
   * Obtener última ubicación conocida del usuario
   */
  private async getLastKnownLocation(userId: string): Promise<GeoLocation | null> {
    const lastEvent = await this.securityEventModel
      .findOne({
        userId,
        location: { $exists: true },
      })
      .sort({ createdAt: -1 });

    if (!lastEvent || !lastEvent.city) {
      return null;
    }

    return {
      ip: lastEvent.ipAddress || '',
      city: lastEvent.city,
      country: lastEvent.country,
      full: lastEvent.location,
    };
  }

  /**
   * Detectar intentos rápidos de login (posible ataque)
   */
  private async detectRapidLoginAttempts(userId: string): Promise<boolean> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const count = await this.securityEventModel.countDocuments({
      userId,
      eventType: { $in: ['suspicious_login', 'new_ip', 'new_location'] },
      createdAt: { $gte: fiveMinutesAgo },
    });

    return count >= 3; // 3 o más eventos en 5 minutos
  }

  /**
   * Bloquear cuenta temporalmente
   */
  private async lockAccount(userId: string, duration: string): Promise<void> {
    const durationMs = this.parseDuration(duration);
    const lockUntil = new Date(Date.now() + durationMs);

    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          isLocked: true,
          lockUntil,
        }
      }
    );

    await this.createSecurityEvent({
      userId: new Types.ObjectId(userId),
      eventType: 'account_locked',
      severity: 'critical',
      riskScore: 100,
      actionTaken: true,
      actionType: 'account_locked',
      metadata: { lockDuration: duration, lockUntil },
    });

    this.logger.warn(`Account locked for user ${userId} until ${lockUntil}`);
  }

  /**
   * Obtener eventos de seguridad de un usuario
   */
  async getUserSecurityEvents(userId: string, limit: number = 50): Promise<SecurityEventDocument[]> {
    return this.securityEventModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Obtener estadísticas de seguridad
   */
  async getSecurityStats(hours: number = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [totalEvents, highSeverity, accountLocks, averageRiskScore] = await Promise.all([
      this.securityEventModel.countDocuments({ createdAt: { $gte: since } }),
      this.securityEventModel.countDocuments({ severity: { $in: ['high', 'critical'] }, createdAt: { $gte: since } }),
      this.securityEventModel.countDocuments({ eventType: 'account_locked', createdAt: { $gte: since } }),
      this.securityEventModel.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: null, avgScore: { $avg: '$riskScore' } } },
      ]),
    ]);

    return {
      period: `Last ${hours} hours`,
      totalEvents,
      highSeverity,
      accountLocks,
      averageRiskScore: averageRiskScore[0]?.avgScore?.toFixed(2) || 0,
    };
  }

  /**
   * Parsear duración en texto a milisegundos
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/(\d+)\s*(minute|hour|day)s?/i);
    if (!match) return 60 * 60 * 1000; // Default: 1 hora

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'minute':
        return value * 60 * 1000;
      case 'hour':
        return value * 60 * 60 * 1000;
      case 'day':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 60 * 60 * 1000;
    }
  }
}
