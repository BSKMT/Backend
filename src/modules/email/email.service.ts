import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface ZohoEmailOptions {
  toAddress: string;
  subject: string;
  content: string;
  fromAddress?: string;
  ccAddress?: string;
  bccAddress?: string;
  mailFormat?: 'html' | 'plaintext';
}

interface EmailTemplate {
  subject: string;
  htmlContent: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private configService: ConfigService) {}

  /**
   * Get or refresh Zoho access token
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    
    // Return cached token if still valid (with 5 min buffer)
    if (this.accessToken && this.tokenExpiresAt > now + 300000) {
      return this.accessToken;
    }

    // Refresh token
    const refreshToken = this.configService.get<string>('ZOHO_REFRESH_TOKEN');
    const clientId = this.configService.get<string>('ZOHO_CLIENT_ID');
    const clientSecret = this.configService.get<string>('ZOHO_CLIENT_SECRET');

    if (!refreshToken || !clientId || !clientSecret) {
      throw new Error('Zoho credentials not configured');
    }

    try {
      const response = await axios.post(
        'https://accounts.zoho.com/oauth/v2/token',
        null,
        {
          params: {
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
            client_id: clientId,
            client_secret: clientSecret,
          },
        },
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiresAt = now + (response.data.expires_in * 1000);

      this.logger.log('Zoho access token refreshed successfully');
      return this.accessToken;
    } catch (error) {
      this.logger.error('Failed to refresh Zoho access token', error);
      throw new Error('Failed to authenticate with Zoho Mail');
    }
  }

  /**
   * Send email via Zoho Mail API
   */
  async sendEmail(options: ZohoEmailOptions): Promise<any> {
    const accountId = this.configService.get<string>('ZOHO_ACCOUNT_ID');
    
    if (!accountId) {
      throw new Error('Zoho account ID not configured');
    }

    const accessToken = await this.getAccessToken();
    const fromAddress = options.fromAddress || this.configService.get<string>('ZOHO_FROM_ADDRESS');

    if (!fromAddress) {
      throw new Error('From address not configured');
    }

    try {
      const response = await axios.post(
        `https://mail.zoho.com/api/accounts/${accountId}/messages`,
        {
          fromAddress,
          toAddress: options.toAddress,
          ccAddress: options.ccAddress,
          bccAddress: options.bccAddress,
          subject: options.subject,
          content: options.content,
          mailFormat: options.mailFormat || 'html',
          encoding: 'UTF-8',
        },
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`Email sent successfully to ${options.toAddress}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${options.toAddress}`, error.response?.data || error.message);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Generate verification email template
   */
  private getVerificationEmailTemplate(data: {
    firstName: string;
    lastName: string;
    verificationUrl: string;
  }): EmailTemplate {
    const subject = 'BSK Motorcycle Team - Verifica tu correo electrónico';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f9fafb; }
          .button { display: inline-block; padding: 12px 30px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏍️ BSK Motorcycle Team</h1>
          </div>
          <div class="content">
            <h2>¡Hola ${data.firstName} ${data.lastName}!</h2>
            <p>Gracias por registrarte en BSK Motorcycle Team. Para completar tu registro, por favor verifica tu correo electrónico.</p>
            <p><strong>⚠️ Tu cuenta está pendiente de verificación.</strong></p>
            <p>Haz clic en el siguiente botón para verificar tu correo electrónico:</p>
            <div style="text-align: center;">
              <a href="${data.verificationUrl}" class="button">Verificar mi correo electrónico</a>
            </div>
            <p>O copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; color: #dc2626;">${data.verificationUrl}</p>
            <p><strong>Este enlace es válido por 24 horas.</strong></p>
            <p>Si no creaste esta cuenta, puedes ignorar este correo.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} BSK Motorcycle Team. Todos los derechos reservados.</p>
            <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, htmlContent };
  }

  /**
   * Generate welcome email template
   */
  private getWelcomeEmailTemplate(data: {
    firstName: string;
    lastName: string;
    membershipType?: string;
  }): EmailTemplate {
    const subject = '¡Bienvenido a BSK Motorcycle Team! 🏍️';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f9fafb; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏍️ ¡Bienvenido a BSK MT!</h1>
          </div>
          <div class="content">
            <h2>¡Hola ${data.firstName} ${data.lastName}!</h2>
            <p>¡Tu cuenta ha sido creada exitosamente! Ahora eres parte de la familia BSK Motorcycle Team.</p>
            ${data.membershipType ? `<p><strong>Tipo de membresía:</strong> ${data.membershipType}</p>` : ''}
            <p>Estamos emocionados de tenerte con nosotros. Próximamente recibirás más información sobre eventos, rutas y actividades del club.</p>
            <p>¡Nos vemos en la carretera! 🏍️</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} BSK Motorcycle Team. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, htmlContent };
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(data: {
    email: string;
    firstName: string;
    lastName: string;
    verificationUrl: string;
  }): Promise<void> {
    const template = this.getVerificationEmailTemplate(data);
    
    await this.sendEmail({
      toAddress: data.email,
      subject: template.subject,
      content: template.htmlContent,
      mailFormat: 'html',
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(data: {
    email: string;
    firstName: string;
    lastName: string;
    membershipType?: string;
  }): Promise<void> {
    const template = this.getWelcomeEmailTemplate(data);
    
    await this.sendEmail({
      toAddress: data.email,
      subject: template.subject,
      content: template.htmlContent,
      mailFormat: 'html',
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(data: {
    email: string;
    firstName: string;
    resetUrl: string;
  }): Promise<void> {
    const subject = 'BSK Motorcycle Team - Restablece tu contraseña';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f9fafb; }
          .button { display: inline-block; padding: 12px 30px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏍️ BSK Motorcycle Team</h1>
          </div>
          <div class="content">
            <h2>Hola ${data.firstName},</h2>
            <p>Recibimos una solicitud para restablecer tu contraseña.</p>
            <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
            <div style="text-align: center;">
              <a href="${data.resetUrl}" class="button">Restablecer contraseña</a>
            </div>
            <p>O copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; color: #dc2626;">${data.resetUrl}</p>
            <p><strong>Este enlace expirará en 1 hora.</strong></p>
            <p>Si no solicitaste restablecer tu contraseña, ignora este correo.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} BSK Motorcycle Team. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      toAddress: data.email,
      subject,
      content: htmlContent,
      mailFormat: 'html',
    });
  }
}
