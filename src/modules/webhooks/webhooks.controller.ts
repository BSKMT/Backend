import {
  Controller,
  Post,
  Body,
  UseGuards,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import {
  BoldWebhookDto,
  MessageBirdWebhookDto,
  SendSmsDto,
  CreatePaymentDto,
} from './dto/webhook.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  // Bold Payment Webhooks (Public endpoints - no auth)
  @Post('bold')
  @ApiOperation({ summary: 'Bold payment webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleBoldWebhook(
    @Body() webhookData: BoldWebhookDto,
    @Headers('x-bold-signature') signature?: string,
  ) {
    // Verify webhook signature
    if (signature) {
      const isValid = this.webhooksService.verifyBoldSignature(
        JSON.stringify(webhookData),
        signature,
      );
      if (!isValid) {
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    const result = await this.webhooksService.handleBoldWebhook(webhookData);
    return result;
  }

  @Post('bold/payment')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Bold payment link' })
  @ApiResponse({ status: 201, description: 'Payment link created' })
  async createPaymentLink(@Body() paymentData: CreatePaymentDto) {
    const result = await this.webhooksService.createPaymentLink(paymentData);
    return {
      success: true,
      data: result,
    };
  }

  // MessageBird SMS Webhooks (Public endpoints - no auth)
  @Post('messagebird')
  @ApiOperation({ summary: 'MessageBird SMS webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleMessageBirdWebhook(
    @Body() webhookData: MessageBirdWebhookDto,
    @Headers('messagebird-signature') signature?: string,
  ) {
    // Verify webhook signature
    if (signature) {
      const isValid = this.webhooksService.verifyMessageBirdSignature(
        JSON.stringify(webhookData),
        signature,
      );
      if (!isValid) {
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    const result = await this.webhooksService.handleMessageBirdWebhook(webhookData);
    return result;
  }

  @Post('sms/send')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send SMS (Admin only)' })
  @ApiResponse({ status: 200, description: 'SMS sent' })
  async sendSms(@Body() smsData: SendSmsDto) {
    const result = await this.webhooksService.sendSms(smsData);
    return result;
  }

  @Post('sms/bulk')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send bulk SMS (Admin only)' })
  @ApiResponse({ status: 200, description: 'Bulk SMS sent' })
  async sendBulkSms(
    @Body() body: { recipients: string[]; message: string },
  ) {
    const result = await this.webhooksService.sendBulkSms(body.recipients, body.message);
    return result;
  }

  @Post('email/send')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send email (Admin only)' })
  @ApiResponse({ status: 200, description: 'Email sent' })
  async sendEmail(
    @Body() body: { to: string; subject: string; html: string },
  ) {
    const result = await this.webhooksService.sendEmail(body.to, body.subject, body.html);
    return result;
  }

  @Post('email/bulk')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send bulk email (Admin only)' })
  @ApiResponse({ status: 200, description: 'Bulk email sent' })
  async sendBulkEmail(
    @Body() body: { recipients: string[]; subject: string; html: string },
  ) {
    const result = await this.webhooksService.sendBulkEmail(
      body.recipients,
      body.subject,
      body.html,
    );
    return result;
  }
}
