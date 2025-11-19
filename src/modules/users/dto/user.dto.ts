import { IsString, IsOptional, IsEmail, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  profileImage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  motorcycleBrand?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  motorcycleModel?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  motorcycleYear?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  motorcyclePlate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  licenseCategory?: string;
}

export class UpdateUserRoleDto {
  @ApiProperty({ enum: ['user', 'admin', 'super-admin'] })
  @IsEnum(['user', 'admin', 'super-admin'])
  role: string;
}

export class ToggleUserStatusDto {
  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  newPassword: string;
}

export class UpdateUserMembershipDto {
  @ApiProperty({ enum: ['friend', 'rider', 'rider-duo', 'pro', 'pro-duo'] })
  @IsEnum(['friend', 'rider', 'rider-duo', 'pro', 'pro-duo'])
  membershipType: string;
}
