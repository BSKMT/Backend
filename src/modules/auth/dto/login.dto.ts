import { IsEmail, IsString, MinLength, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email del usuario',
  })
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  email: string;

  @ApiProperty({
    example: 'SecureP@ssw0rd',
    description: 'Contraseña del usuario',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @ApiProperty({
    example: false,
    description: 'Recordar sesión por más tiempo',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;

  @ApiProperty({
    example: '123456',
    description: 'Código de autenticación de dos factores (6 dígitos o código de respaldo)',
    required: false,
  })
  @IsOptional()
  @IsString()
  twoFactorCode?: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Token de refresh para renovar el access token',
  })
  @IsString()
  refreshToken: string;
}

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Token de verificación de email',
  })
  @IsString()
  token: string;
}

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email del usuario que olvidó su contraseña',
  })
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Token de reseteo de contraseña',
  })
  @IsString()
  token: string;

  @ApiProperty({
    example: 'NewSecureP@ssw0rd',
    description: 'Nueva contraseña',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  newPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Contraseña actual',
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    description: 'Nueva contraseña',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  newPassword: string;
}
