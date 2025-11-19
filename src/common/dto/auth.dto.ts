import { IsEmail, IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;
}

export class RegisterDto {
  @ApiProperty({ description: 'Document type', example: 'CC' })
  @IsString()
  @IsNotEmpty()
  documentType: string;

  @ApiProperty({ description: 'Document number', example: '1234567890' })
  @IsString()
  @IsNotEmpty()
  documentNumber: string;

  @ApiProperty({ description: 'First name', example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Pérez' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: 'Birth date', example: '1990-01-01' })
  @IsString()
  @IsNotEmpty()
  birthDate: string;

  @ApiProperty({ description: 'Birth place', example: 'Bogotá' })
  @IsString()
  @IsNotEmpty()
  birthPlace: string;

  @ApiProperty({ description: 'Phone number', example: '+573001234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: 'Email address', example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Address', example: 'Calle 123 #45-67' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: 'City', example: 'Bogotá' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'Country', example: 'Colombia' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ description: 'Binary gender', example: 'Masculino' })
  @IsString()
  @IsNotEmpty()
  binaryGender: string;

  @ApiProperty({ description: 'Emergency contact name', example: 'María Pérez' })
  @IsString()
  @IsNotEmpty()
  emergencyContactName: string;

  @ApiProperty({ description: 'Emergency contact relationship', example: 'Madre' })
  @IsString()
  @IsNotEmpty()
  emergencyContactRelationship: string;

  @ApiProperty({ description: 'Emergency contact phone', example: '+573001234567' })
  @IsString()
  @IsNotEmpty()
  emergencyContactPhone: string;

  @ApiProperty({ description: 'Password', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial',
  })
  password: string;

  @ApiProperty({ description: 'Accepted terms and conditions', example: true })
  @IsNotEmpty()
  acceptedTerms: boolean;

  @ApiProperty({ description: 'Accepted privacy policy', example: true })
  @IsNotEmpty()
  acceptedPrivacyPolicy: boolean;

  @ApiProperty({ description: 'Accepted data processing', example: true })
  @IsNotEmpty()
  acceptedDataProcessing: boolean;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token received via email' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'New password', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial',
  })
  newPassword: string;
}
