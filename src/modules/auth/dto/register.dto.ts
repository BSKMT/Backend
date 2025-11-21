import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsPhoneNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'Juan',
    description: 'Nombre del usuario',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El nombre no puede exceder 50 caracteres' })
  firstName: string;

  @ApiProperty({
    example: 'Pérez',
    description: 'Apellido del usuario',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El apellido no puede exceder 50 caracteres' })
  lastName: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Email del usuario (único)',
  })
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  email: string;

  @ApiProperty({
    example: 'SecureP@ssw0rd123',
    description:
      'Contraseña (mínimo 8 caracteres, debe incluir mayúsculas, minúsculas, números y símbolos)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message:
        'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial',
    },
  )
  password: string;

  @ApiProperty({
    example: '+573001234567',
    description: 'Número de teléfono (opcional)',
    required: false,
  })
  @IsOptional()
  @IsPhoneNumber('CO', {
    message: 'Debe proporcionar un número de teléfono válido',
  })
  phone?: string;

  @ApiProperty({
    example: 'Calle 123 #45-67',
    description: 'Dirección del usuario (opcional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    example: 'Bogotá',
    description: 'Ciudad del usuario (opcional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  city?: string;
}
