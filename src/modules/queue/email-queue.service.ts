import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export interface EmailJob {
  to: string;
  subject: string;
  template: 'verification' | 'password-reset' | 'password-changed' | 'welcome' | 'security-alert';
  context: Record<string, any>;
  priority?: number;
}

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);

  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  /**
   * Agregar email de verificación a la cola
   */
  async sendVerificationEmail(email: string, token: string, userName: string): Promise<void> {
    const job: EmailJob = {
      to: email,
      subject: 'Verifica tu cuenta - BSK Motorcycle Team',
      template: 'verification',
      context: {
        userName,
        verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${token}`,
        token,
      },
      priority: 1, // Alta prioridad
    };

    await this.emailQueue.add('send-email', job, {
      priority: 1,
      attempts: 5,
    });

    this.logger.log(`Verification email queued for: ${email}`);
  }

  /**
   * Agregar email de reset de contraseña a la cola
   */
  async sendPasswordResetEmail(email: string, token: string, userName: string): Promise<void> {
    const job: EmailJob = {
      to: email,
      subject: 'Restablece tu contraseña - BSK Motorcycle Team',
      template: 'password-reset',
      context: {
        userName,
        resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${token}`,
        token,
        expiresIn: '1 hora',
      },
      priority: 1, // Alta prioridad
    };

    await this.emailQueue.add('send-email', job, {
      priority: 1,
      attempts: 5,
    });

    this.logger.log(`Password reset email queued for: ${email}`);
  }

  /**
   * Agregar email de notificación de cambio de contraseña
   */
  async sendPasswordChangedEmail(email: string, userName: string, ipAddress: string): Promise<void> {
    const job: EmailJob = {
      to: email,
      subject: 'Tu contraseña ha sido cambiada - BSK Motorcycle Team',
      template: 'password-changed',
      context: {
        userName,
        ipAddress,
        timestamp: new Date().toLocaleString('es-CO'),
        supportUrl: `${process.env.FRONTEND_URL}/contact`,
      },
      priority: 1, // Alta prioridad
    };

    await this.emailQueue.add('send-email', job, {
      priority: 1,
      attempts: 3,
    });

    this.logger.log(`Password changed notification queued for: ${email}`);
  }

  /**
   * Agregar email de bienvenida a la cola
   */
  async sendWelcomeEmail(email: string, userName: string): Promise<void> {
    const job: EmailJob = {
      to: email,
      subject: '¡Bienvenido a BSK Motorcycle Team!',
      template: 'welcome',
      context: {
        userName,
        dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
      },
      priority: 3, // Prioridad normal
    };

    await this.emailQueue.add('send-email', job, {
      priority: 3,
      attempts: 3,
    });

    this.logger.log(`Welcome email queued for: ${email}`);
  }

  /**
   * Enviar alerta de seguridad
   */
  async sendSecurityAlert(
    email: string,
    userName: string,
    alertType: string,
    details: Record<string, any>,
  ): Promise<void> {
    const job: EmailJob = {
      to: email,
      subject: `Alerta de Seguridad - ${alertType}`,
      template: 'security-alert',
      context: {
        userName,
        alertType,
        ...details,
        timestamp: new Date().toLocaleString('es-CO'),
      },
      priority: 1, // Alta prioridad
    };

    await this.emailQueue.add('send-email', job, {
      priority: 1,
      attempts: 3,
    });

    this.logger.log(`Security alert queued for: ${email} - ${alertType}`);
  }

  /**
   * Obtener estadísticas de la cola
   */
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.emailQueue.getWaitingCount(),
      this.emailQueue.getActiveCount(),
      this.emailQueue.getCompletedCount(),
      this.emailQueue.getFailedCount(),
      this.emailQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed,
    };
  }
}
