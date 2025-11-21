import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EmailJob } from './email-queue.service';

@Processor('email')
export class EmailQueueProcessor {
  private readonly logger = new Logger(EmailQueueProcessor.name);

  @Process('send-email')
  async handleSendEmail(job: Job<EmailJob>): Promise<void> {
    const { to, subject, template, context } = job.data;

    this.logger.log(`Processing email job ${job.id} for ${to}`);

    try {
      // TODO: Integrar con servicio de email real (Nodemailer, SendGrid, etc.)
      // Por ahora, simulamos el envío
      await this.sendEmail(to, subject, template, context);

      this.logger.log(`Email sent successfully to ${to} using template ${template}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw error; // Re-throw para que Bull reintente según configuración
    }
  }

  /**
   * Método para enviar email (placeholder para integración real)
   */
  private async sendEmail(
    to: string,
    subject: string,
    template: string,
    context: Record<string, any>,
  ): Promise<void> {
    // Simular delay de red
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // TODO: Implementar envío real de emails
    // Ejemplo con Nodemailer:
    // const transporter = nodemailer.createTransport({ ... });
    // await transporter.sendMail({
    //   from: process.env.EMAIL_FROM,
    //   to,
    //   subject,
    //   html: this.renderTemplate(template, context),
    // });

    this.logger.debug(`[MOCK] Email sent to ${to} - Subject: ${subject}`);
    this.logger.debug(`[MOCK] Template: ${template}`, context);

    // En producción, descomentar esto para envío real
    /*
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const html = await this.renderTemplate(template, context);

    await transporter.sendMail({
      from: `"BSK Motorcycle Team" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
    });
    */
  }

  /**
   * Renderizar template de email
   */
  private renderTemplate(template: string, context: Record<string, any>): string {
    // TODO: Usar un motor de templates real (Handlebars, EJS, etc.)
    const templates: Record<string, (ctx: any) => string> = {
      verification: (ctx) => `
        <h1>¡Hola ${ctx.userName}!</h1>
        <p>Gracias por registrarte en BSK Motorcycle Team.</p>
        <p>Por favor verifica tu cuenta haciendo clic en el siguiente enlace:</p>
        <a href="${ctx.verificationUrl}">Verificar Email</a>
        <p>O copia y pega este enlace en tu navegador:</p>
        <p>${ctx.verificationUrl}</p>
        <p>Este enlace expirará en 24 horas.</p>
      `,
      'password-reset': (ctx) => `
        <h1>Hola ${ctx.userName},</h1>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
        <a href="${ctx.resetUrl}">Restablecer Contraseña</a>
        <p>O copia y pega este enlace en tu navegador:</p>
        <p>${ctx.resetUrl}</p>
        <p>Este enlace expirará en ${ctx.expiresIn}.</p>
        <p>Si no solicitaste este cambio, ignora este email.</p>
      `,
      'password-changed': (ctx) => `
        <h1>Hola ${ctx.userName},</h1>
        <p>Tu contraseña ha sido cambiada exitosamente.</p>
        <p><strong>Detalles del cambio:</strong></p>
        <ul>
          <li>Fecha y hora: ${ctx.timestamp}</li>
          <li>Dirección IP: ${ctx.ipAddress}</li>
        </ul>
        <p>Si no realizaste este cambio, por favor contacta a soporte inmediatamente:</p>
        <a href="${ctx.supportUrl}">Contactar Soporte</a>
      `,
      welcome: (ctx) => `
        <h1>¡Bienvenido a BSK Motorcycle Team, ${ctx.userName}!</h1>
        <p>Tu cuenta ha sido verificada exitosamente.</p>
        <p>Ya puedes acceder a tu dashboard:</p>
        <a href="${ctx.dashboardUrl}">Ir al Dashboard</a>
        <p>¡Disfruta de todos nuestros beneficios!</p>
      `,
      'security-alert': (ctx) => `
        <h1>Alerta de Seguridad</h1>
        <p>Hola ${ctx.userName},</p>
        <p>Hemos detectado actividad importante en tu cuenta:</p>
        <p><strong>${ctx.alertType}</strong></p>
        <p>Fecha y hora: ${ctx.timestamp}</p>
        <p>Si reconoces esta actividad, puedes ignorar este mensaje.</p>
        <p>De lo contrario, te recomendamos cambiar tu contraseña inmediatamente.</p>
      `,
    };

    return templates[template]?.(context) || `<p>Template not found: ${template}</p>`;
  }
}
