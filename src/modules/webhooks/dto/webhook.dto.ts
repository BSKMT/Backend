import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

export class BoldWebhookDto {
  @ApiProperty()
  @IsNotEmpty()
  id: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(['COMPLETED', 'FAILED', 'PENDING', 'REJECTED'])
  status: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiProperty()
  @IsNotEmpty()
  reference: string;

  @ApiProperty()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsOptional()
  metadata?: any;

  @ApiProperty()
  @IsNotEmpty()
  createdAt: string;
}

export class MessageBirdWebhookDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(['sent', 'delivered', 'failed'])
  status: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  recipient: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty()
  @IsOptional()
  statusReason?: string;
}

export class SendSmsDto {
  @ApiProperty({ example: '+573001234567' })
  @IsNotEmpty()
  @IsString()
  recipient: string;

  @ApiProperty({ example: 'Tu mensaje aquí' })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiProperty({ example: 'ref-123', required: false })
  @IsOptional()
  @IsString()
  reference?: string;
}

export class CreatePaymentDto {
  @ApiProperty({ example: 100000 })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'Membresía Oro' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ example: 'REF-12345' })
  @IsNotEmpty()
  @IsString()
  reference: string;

  @ApiProperty({ example: { userId: '123', membershipId: '456' }, required: false })
  @IsOptional()
  metadata?: any;
}
