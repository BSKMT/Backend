import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../common/schemas/user.schema';
import { BoldWebhookDto, MessageBirdWebhookDto, SendSmsDto, CreatePaymentDto } from './dto/webhook.dto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  // Bold Payment Gateway Integration
  async handleBoldWebhook(webhookData: BoldWebhookDto) {
    this.logger.log(`Processing Bold webhook: ${webhookData.id}`);

    try {
      // Verify webhook signature (TODO: implement signature verification)
      
      // Process payment based on status
      switch (webhookData.status) {
        case 'COMPLETED':
          await this.handleSuccessfulPayment(webhookData);
          break;
        case 'FAILED':
        case 'REJECTED':
          await this.handleFailedPayment(webhookData);
          break;
        case 'PENDING':
          await this.handlePendingPayment(webhookData);
          break;
        default:
          this.logger.warn(`Unknown payment status: ${webhookData.status}`);
      }

      return {
        success: true,
        message: 'Webhook processed successfully',
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error processing Bold webhook: ${err.message}`);
      throw error;
    }
  }

  private async handleSuccessfulPayment(webhookData: BoldWebhookDto) {
    this.logger.log(`Payment completed: ${webhookData.id}`);

    // Extract metadata (userId, membershipId, etc.)
    const { userId, membershipId } = webhookData.metadata || {};

    if (userId && membershipId) {
      // Update user membership
      const user = await this.userModel.findById(userId);
      if (user) {
        user.membershipType = membershipId;
        await user.save();
        this.logger.log(`Updated user ${userId} membership to ${membershipId}`);
      }
    }

    // TODO: Send confirmation email/SMS
    // TODO: Create transaction record
    // TODO: Update membership history
  }

  private async handleFailedPayment(webhookData: BoldWebhookDto) {
    this.logger.warn(`Payment failed: ${webhookData.id}`);
    
    // TODO: Send failure notification
    // TODO: Create failed transaction record
  }

  private async handlePendingPayment(webhookData: BoldWebhookDto) {
    this.logger.log(`Payment pending: ${webhookData.id}`);
    
    // TODO: Create pending transaction record
  }

  async createPaymentLink(paymentData: CreatePaymentDto) {
    // TODO: Implement Bold API integration
    // This is a placeholder for the Bold payment link creation
    
    const boldApiUrl = this.configService.get('BOLD_API_URL');
    const boldApiKey = this.configService.get('BOLD_API_KEY');

    if (!boldApiUrl || !boldApiKey) {
      throw new BadRequestException('Bold payment configuration missing');
    }

    this.logger.log(`Creating payment link for amount: ${paymentData.amount}`);

    // Placeholder response
    return {
      paymentLink: `${boldApiUrl}/checkout/${paymentData.reference}`,
      reference: paymentData.reference,
      amount: paymentData.amount,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };
  }

  // MessageBird SMS Integration
  async handleMessageBirdWebhook(webhookData: MessageBirdWebhookDto) {
    this.logger.log(`Processing MessageBird webhook: ${webhookData.id}`);

    try {
      // Process SMS status update
      switch (webhookData.status) {
        case 'delivered':
          this.logger.log(`SMS delivered to ${webhookData.recipient}`);
          break;
        case 'failed':
          this.logger.warn(`SMS failed to ${webhookData.recipient}: ${webhookData.statusReason}`);
          break;
        case 'sent':
          this.logger.log(`SMS sent to ${webhookData.recipient}`);
          break;
      }

      // TODO: Update SMS delivery status in database
      // TODO: Handle reference tracking

      return {
        success: true,
        message: 'Webhook processed successfully',
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error processing MessageBird webhook: ${err.message}`);
      throw error;
    }
  }

  async sendSms(smsData: SendSmsDto) {
    // TODO: Implement MessageBird API integration
    
    const messageBirdApiKey = this.configService.get('MESSAGEBIRD_API_KEY');
    const messageBirdOriginator = this.configService.get('MESSAGEBIRD_ORIGINATOR') || 'BSKMT';

    if (!messageBirdApiKey) {
      throw new BadRequestException('MessageBird configuration missing');
    }

    this.logger.log(`Sending SMS to ${smsData.recipient}`);

    // Placeholder implementation
    // In production, use MessageBird SDK:
    // const messagebird = require('messagebird')(messageBirdApiKey);
    // const result = await messagebird.messages.create({
    //   originator: messageBirdOriginator,
    //   recipients: [smsData.recipient],
    //   body: smsData.message,
    //   reference: smsData.reference,
    // });

    return {
      success: true,
      message: 'SMS queued for delivery',
      recipient: smsData.recipient,
      reference: smsData.reference || `SMS-${Date.now()}`,
    };
  }

  async sendBulkSms(recipients: string[], message: string) {
    this.logger.log(`Sending bulk SMS to ${recipients.length} recipients`);

    const results = await Promise.allSettled(
      recipients.map((recipient) =>
        this.sendSms({ recipient, message }),
      ),
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return {
      success: true,
      message: `Sent ${successful} SMS, ${failed} failed`,
      successful,
      failed,
      total: recipients.length,
    };
  }

  // Email integration placeholder
  async sendEmail(to: string, subject: string, html: string) {
    // TODO: Implement email service (Resend, SendGrid, etc.)
    
    this.logger.log(`Sending email to ${to}`);

    return {
      success: true,
      message: 'Email queued for delivery',
      to,
      subject,
    };
  }

  async sendBulkEmail(recipients: string[], subject: string, html: string) {
    this.logger.log(`Sending bulk email to ${recipients.length} recipients`);

    const results = await Promise.allSettled(
      recipients.map((to) => this.sendEmail(to, subject, html)),
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return {
      success: true,
      message: `Sent ${successful} emails, ${failed} failed`,
      successful,
      failed,
      total: recipients.length,
    };
  }

  // Webhook verification utilities
  verifyBoldSignature(payload: string, signature: string): boolean {
    // TODO: Implement Bold signature verification
    const boldWebhookSecret = this.configService.get('BOLD_WEBHOOK_SECRET');
    
    if (!boldWebhookSecret) {
      this.logger.warn('Bold webhook secret not configured');
      return true; // Allow in development
    }

    // Implement HMAC signature verification
    return true;
  }

  verifyMessageBirdSignature(payload: string, signature: string): boolean {
    // TODO: Implement MessageBird signature verification
    const messageBirdWebhookSecret = this.configService.get('MESSAGEBIRD_WEBHOOK_SECRET');
    
    if (!messageBirdWebhookSecret) {
      this.logger.warn('MessageBird webhook secret not configured');
      return true; // Allow in development
    }

    return true;
  }
}
