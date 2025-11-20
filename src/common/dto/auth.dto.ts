import { IsEmail, IsString, IsNotEmpty, MinLength, Matches, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({ description: 'WhatsApp number', example: '+573001234567' })
  @IsString()
  @IsOptional()
  whatsapp?: string;

  @ApiProperty({ description: 'Email address', example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Address', example: 'Calle 123 #45-67' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({ description: 'Neighborhood', example: 'Chapinero' })
  @IsString()
  @IsOptional()
  neighborhood?: string;

  @ApiProperty({ description: 'City', example: 'Bogotá' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'Country', example: 'Colombia' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiPropertyOptional({ description: 'Postal code', example: '110111' })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiProperty({ description: 'Binary gender', example: 'Masculino' })
  @IsString()
  @IsNotEmpty()
  binaryGender: string;

  @ApiPropertyOptional({ description: 'Gender identity', example: 'Masculino' })
  @IsString()
  @IsOptional()
  genderIdentity?: string;

  @ApiPropertyOptional({ description: 'Occupation', example: 'Ingeniero' })
  @IsString()
  @IsOptional()
  occupation?: string;

  @ApiPropertyOptional({ description: 'Discipline', example: 'Velocidad' })
  @IsString()
  @IsOptional()
  discipline?: string;

  @ApiPropertyOptional({ description: 'Blood type', example: 'O' })
  @IsString()
  @IsOptional()
  bloodType?: string;

  @ApiPropertyOptional({ description: 'RH factor', example: '+' })
  @IsString()
  @IsOptional()
  rhFactor?: string;

  @ApiPropertyOptional({ description: 'Allergies', example: 'Ninguna' })
  @IsString()
  @IsOptional()
  allergies?: string;

  @ApiPropertyOptional({ description: 'Health insurance', example: 'Sanitas' })
  @IsString()
  @IsOptional()
  healthInsurance?: string;

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

  @ApiPropertyOptional({ description: 'Emergency contact address', example: 'Calle 123 #45-67' })
  @IsString()
  @IsOptional()
  emergencyContactAddress?: string;

  @ApiPropertyOptional({ description: 'Emergency contact neighborhood', example: 'Chapinero' })
  @IsString()
  @IsOptional()
  emergencyContactNeighborhood?: string;

  @ApiPropertyOptional({ description: 'Emergency contact city', example: 'Bogotá' })
  @IsString()
  @IsOptional()
  emergencyContactCity?: string;

  @ApiPropertyOptional({ description: 'Emergency contact country', example: 'Colombia' })
  @IsString()
  @IsOptional()
  emergencyContactCountry?: string;

  @ApiPropertyOptional({ description: 'Emergency contact postal code', example: '110111' })
  @IsString()
  @IsOptional()
  emergencyContactPostalCode?: string;

  @ApiPropertyOptional({ description: 'Motorcycle brand', example: 'Honda' })
  @IsString()
  @IsOptional()
  motorcycleBrand?: string;

  @ApiPropertyOptional({ description: 'Motorcycle model', example: 'CBR 600RR' })
  @IsString()
  @IsOptional()
  motorcycleModel?: string;

  @ApiPropertyOptional({ description: 'Motorcycle year', example: '2022' })
  @IsString()
  @IsOptional()
  motorcycleYear?: string;

  @ApiPropertyOptional({ description: 'Motorcycle plate', example: 'ABC123' })
  @IsString()
  @IsOptional()
  motorcyclePlate?: string;

  @ApiPropertyOptional({ description: 'Motorcycle engine size', example: '600cc' })
  @IsString()
  @IsOptional()
  motorcycleEngineSize?: string;

  @ApiPropertyOptional({ description: 'Motorcycle color', example: 'Rojo' })
  @IsString()
  @IsOptional()
  motorcycleColor?: string;

  @ApiPropertyOptional({ description: 'SOAT expiration date', example: '2025-12-31' })
  @IsString()
  @IsOptional()
  soatExpirationDate?: string;

  @ApiPropertyOptional({ description: 'Technical review expiration date', example: '2025-12-31' })
  @IsString()
  @IsOptional()
  technicalReviewExpirationDate?: string;

  @ApiPropertyOptional({ description: 'License number', example: '12345678' })
  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @ApiPropertyOptional({ description: 'License category', example: 'A2' })
  @IsString()
  @IsOptional()
  licenseCategory?: string;

  @ApiPropertyOptional({ description: 'License expiration date', example: '2025-12-31' })
  @IsString()
  @IsOptional()
  licenseExpirationDate?: string;

  @ApiPropertyOptional({ description: 'Membership type', example: 'premium' })
  @IsString()
  @IsOptional()
  membershipType?: string;

  @ApiPropertyOptional({ description: 'Profile image URL', example: 'https://example.com/image.jpg' })
  @IsString()
  @IsOptional()
  profileImage?: string;

  @ApiPropertyOptional({ description: 'Data consent', example: true })
  @IsBoolean()
  @IsOptional()
  dataConsent?: boolean;

  @ApiPropertyOptional({ description: 'Liability waiver', example: true })
  @IsBoolean()
  @IsOptional()
  liabilityWaiver?: boolean;

  @ApiPropertyOptional({ description: 'Terms acceptance', example: true })
  @IsBoolean()
  @IsOptional()
  termsAcceptance?: boolean;

  @ApiPropertyOptional({ description: 'reCAPTCHA token' })
  @IsString()
  @IsOptional()
  recaptchaToken?: string;

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
