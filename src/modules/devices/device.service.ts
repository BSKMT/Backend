import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { UAParser } from 'ua-parser-js';
import { TrustedDevice, TrustedDeviceDocument } from './entities/trusted-device.schema';
import { EmailQueueService } from '../queue/email-queue.service';

interface DeviceInfo {
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
  location?: {
    city?: string;
    country?: string;
    full?: string;
  };
}

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);
  private readonly DEVICE_EXPIRATION_DAYS = 30;

  constructor(
    @InjectModel(TrustedDevice.name) private trustedDeviceModel: Model<TrustedDeviceDocument>,
    private emailQueueService: EmailQueueService,
  ) {}

  /**
   * Verificar si un dispositivo es confiable
   */
  async isDeviceTrusted(userId: string, deviceFingerprint: string, rememberToken?: string): Promise<boolean> {
    const query: any = {
      userId,
      deviceFingerprint,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    };

    if (rememberToken) {
      query.rememberToken = rememberToken;
    }

    const device = await this.trustedDeviceModel.findOne(query);

    if (device) {
      // Actualizar último uso
      await this.trustedDeviceModel.updateOne(
        { _id: device._id },
        { $set: { lastUsedAt: new Date() } }
      );
      return true;
    }

    return false;
  }

  /**
   * Agregar dispositivo confiable
   */
  async trustDevice(userId: string, deviceInfo: DeviceInfo, userName: string, email: string): Promise<{ rememberToken: string; expiresAt: Date }> {
    const parser = new UAParser();
    parser.setUA(deviceInfo.userAgent);
    const parsedUA = parser.getResult();

    // Generar token único para cookie
    const rememberToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.DEVICE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);

    const deviceName = this.generateDeviceName(parsedUA);

    const trustedDevice = new this.trustedDeviceModel({
      userId,
      deviceFingerprint: deviceInfo.deviceFingerprint,
      deviceName,
      deviceType: this.getDeviceType(parsedUA),
      browser: `${parsedUA.browser.name || 'Unknown'} ${parsedUA.browser.version || ''}`.trim(),
      os: `${parsedUA.os.name || 'Unknown'} ${parsedUA.os.version || ''}`.trim(),
      ipAddress: deviceInfo.ipAddress,
      location: deviceInfo.location?.full,
      city: deviceInfo.location?.city,
      country: deviceInfo.location?.country,
      rememberToken,
      expiresAt,
      userAgent: deviceInfo.userAgent,
    });

    await trustedDevice.save();

    // Enviar notificación por email
    await this.emailQueueService.sendSecurityAlert(
      email,
      userName,
      'Nuevo dispositivo confiable agregado',
      {
        deviceName,
        browser: trustedDevice.browser,
        os: trustedDevice.os,
        location: deviceInfo.location?.full || deviceInfo.ipAddress,
        timestamp: new Date().toLocaleString('es-CO'),
        expiresAt: expiresAt.toLocaleDateString('es-CO'),
      }
    );

    this.logger.log(`Trusted device added for user ${userId}: ${deviceName}`);

    return { rememberToken, expiresAt };
  }

  /**
   * Listar dispositivos confiables de un usuario
   */
  async listUserDevices(userId: string): Promise<TrustedDeviceDocument[]> {
    return this.trustedDeviceModel
      .find({
        userId,
        isRevoked: false,
        expiresAt: { $gt: new Date() },
      })
      .sort({ lastUsedAt: -1 })
      .exec();
  }

  /**
   * Revocar dispositivo confiable
   */
  async revokeDevice(userId: string, deviceId: string): Promise<void> {
    const device = await this.trustedDeviceModel.findOne({
      _id: deviceId,
      userId,
    });

    if (!device) {
      throw new NotFoundException('Dispositivo no encontrado');
    }

    await this.trustedDeviceModel.updateOne(
      { _id: deviceId },
      {
        $set: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: 'User revoked',
        }
      }
    );

    this.logger.log(`Trusted device revoked for user ${userId}: ${device.deviceName}`);
  }

  /**
   * Revocar todos los dispositivos de un usuario
   */
  async revokeAllUserDevices(userId: string): Promise<number> {
    const result = await this.trustedDeviceModel.updateMany(
      { userId, isRevoked: false },
      {
        $set: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: 'All devices revoked by user',
        }
      }
    );

    this.logger.log(`All trusted devices revoked for user ${userId}. Count: ${result.modifiedCount}`);
    return result.modifiedCount;
  }

  /**
   * Verificar si es un dispositivo nuevo
   */
  async isNewDevice(userId: string, deviceFingerprint: string): Promise<boolean> {
    const count = await this.trustedDeviceModel.countDocuments({
      userId,
      deviceFingerprint,
    });

    return count === 0;
  }

  /**
   * Obtener dispositivo por token
   */
  async getDeviceByToken(rememberToken: string): Promise<TrustedDeviceDocument | null> {
    return this.trustedDeviceModel.findOne({
      rememberToken,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });
  }

  /**
   * Limpiar dispositivos expirados manualmente (backup del TTL)
   */
  async cleanExpiredDevices(): Promise<number> {
    const result = await this.trustedDeviceModel.deleteMany({
      expiresAt: { $lt: new Date() },
    });

    this.logger.log(`Cleaned ${result.deletedCount} expired devices`);
    return result.deletedCount;
  }

  /**
   * Generar nombre amigable para el dispositivo
   */
  private generateDeviceName(parsedUA: UAParser.IResult): string {
    const browser = parsedUA.browser.name || 'Unknown Browser';
    const os = parsedUA.os.name || 'Unknown OS';
    const device = parsedUA.device.type || 'desktop';

    if (device === 'mobile') {
      return `${parsedUA.device.vendor || 'Mobile'} - ${os}`;
    } else if (device === 'tablet') {
      return `${parsedUA.device.vendor || 'Tablet'} - ${os}`;
    } else {
      return `${browser} on ${os}`;
    }
  }

  /**
   * Determinar tipo de dispositivo
   */
  private getDeviceType(parsedUA: UAParser.IResult): 'desktop' | 'mobile' | 'tablet' {
    const type = parsedUA.device.type;
    if (type === 'mobile') return 'mobile';
    if (type === 'tablet') return 'tablet';
    return 'desktop';
  }
}
