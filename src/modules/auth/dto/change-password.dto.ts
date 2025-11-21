import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Contraseña actual del usuario',
    example: 'CurrentP@ssw0rd123',
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña actual es requerida' })
  currentPassword: string;

  @ApiProperty({
    description: 'Nueva contraseña (mínimo 8 caracteres, mayúsculas, minúsculas, números y caracteres especiales)',
    example: 'NewSecureP@ssw0rd456',
  })
  @IsString()
  @IsNotEmpty({ message: 'La nueva contraseña es requerida' })
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  @Matches(/[a-z]/, { message: 'La nueva contraseña debe contener al menos una letra minúscula' })
  @Matches(/[A-Z]/, { message: 'La nueva contraseña debe contener al menos una letra mayúscula' })
  @Matches(/\d/, { message: 'La nueva contraseña debe contener al menos un número' })
  @Matches(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, {
    message: 'La nueva contraseña debe contener al menos un carácter especial',
  })
  newPassword: string;

  @ApiProperty({
    description: 'Confirmación de la nueva contraseña',
    example: 'NewSecureP@ssw0rd456',
  })
  @IsString()
  @IsNotEmpty({ message: 'La confirmación de contraseña es requerida' })
  confirmPassword: string;
}
