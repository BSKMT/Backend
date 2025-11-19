import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection() private connection: Connection,
    private configService: ConfigService,
  ) {}

  /**
   * General health check
   */
  async checkHealth() {
    const dbConnected = this.connection.readyState === 1;

    return {
      success: true,
      status: dbConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: this.configService.get<string>('NODE_ENV'),
      uptime: process.uptime(),
    };
  }

  /**
   * Database health check
   */
  async checkDatabase() {
    try {
      const connected = this.connection.readyState === 1;

      if (!connected) {
        return {
          success: false,
          connected: false,
          message: 'Database not connected',
          state: this.connection.readyState,
        };
      }

      let collectionCount = 0;
      if (this.connection.db) {
        const collections = await this.connection.db.listCollections().toArray();
        collectionCount = collections.length;
      }

      return {
        success: true,
        connected: true,
        database: this.connection.name,
        collections: collectionCount,
        host: this.connection.host,
        message: 'Database connection healthy',
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        connected: false,
        message: 'Database health check failed',
        error: err.message,
      };
    }
  }

  /**
   * Environment variables check
   */
  checkEnvironment() {
    const envInfo = {
      nodeEnv: this.configService.get<string>('NODE_ENV'),
      hasCloudinary: !!(
        this.configService.get<string>('CLOUDINARY_CLOUD_NAME') &&
        this.configService.get<string>('CLOUDINARY_API_KEY')
      ),
      hasRecaptcha: !!this.configService.get<string>('RECAPTCHA_SECRET_KEY'),
      hasRedis: !!(
        this.configService.get<string>('REDIS_URL') ||
        this.configService.get<string>('REDIS_HOST')
      ),
      hasBold: !!this.configService.get<string>('BOLD_API_KEY'),
    };

    const warnings: string[] = [];
    if (!envInfo.hasCloudinary) warnings.push('Cloudinary not configured');
    if (!envInfo.hasRecaptcha) warnings.push('reCAPTCHA not configured');
    if (!envInfo.hasRedis) warnings.push('Redis not configured');

    return {
      success: true,
      valid: warnings.length === 0,
      environment: envInfo.nodeEnv,
      services: {
        cloudinary: envInfo.hasCloudinary,
        recaptcha: envInfo.hasRecaptcha,
        redis: envInfo.hasRedis,
        payment: envInfo.hasBold,
      },
      warnings,
    };
  }
}
