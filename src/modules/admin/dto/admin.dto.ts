import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEmail, IsEnum } from 'class-validator';

export class AdminUpdateUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'oro', enum: ['basico', 'plata', 'oro', 'platino'] })
  @IsOptional()
  @IsEnum(['basico', 'plata', 'oro', 'platino'])
  membershipType?: string;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive', 'pending'] })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'pending'])
  accountStatus?: string;
}

export class SendBulkEmailDto {
  @ApiProperty({ example: ['user@example.com'] })
  @IsNotEmpty()
  recipients: string[];

  @ApiProperty({ example: 'Important Update' })
  @IsNotEmpty()
  @IsString()
  subject: string;

  @ApiProperty({ example: '<p>Email content here</p>' })
  @IsNotEmpty()
  @IsString()
  htmlContent: string;

  @ApiProperty({ example: 'oro', required: false })
  @IsOptional()
  @IsEnum(['basico', 'plata', 'oro', 'platino'])
  membershipTypeFilter?: string;
}

export class SendBulkSmsDto {
  @ApiProperty({ example: ['+573001234567'] })
  @IsNotEmpty()
  recipients: string[];

  @ApiProperty({ example: 'Your message here' })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiProperty({ example: 'oro', required: false })
  @IsOptional()
  @IsEnum(['basico', 'plata', 'oro', 'platino'])
  membershipTypeFilter?: string;
}
