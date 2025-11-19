import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';

export class CreateContactMessageDto {
  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+573001234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Consulta sobre membresías' })
  @IsNotEmpty()
  @IsString()
  subject: string;

  @ApiProperty({ example: 'Me gustaría saber más información...' })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiProperty({
    example: 'general',
    enum: ['general', 'membership', 'events', 'complaints', 'suggestions', 'technical', 'emergency'],
  })
  @IsOptional()
  @IsEnum(['general', 'membership', 'events', 'complaints', 'suggestions', 'technical', 'emergency'])
  category?: string;
}

export class RespondContactMessageDto {
  @ApiProperty({ example: 'Gracias por tu mensaje...' })
  @IsNotEmpty()
  @IsString()
  response: string;

  @ApiProperty({ example: 'resolved', enum: ['in-progress', 'resolved', 'closed'] })
  @IsOptional()
  @IsEnum(['in-progress', 'resolved', 'closed'])
  newStatus?: string;
}

export class CreatePQRSDFDto {
  @ApiProperty({
    example: 'peticion',
    enum: ['peticion', 'queja', 'reclamo', 'sugerencia', 'denuncia', 'felicitacion'],
  })
  @IsNotEmpty()
  @IsEnum(['peticion', 'queja', 'reclamo', 'sugerencia', 'denuncia', 'felicitacion'])
  categoria: string;

  @ApiProperty({
    example: 'general',
    enum: ['general', 'reembolso', 'cambio_datos', 'certificado', 'otro'],
  })
  @IsOptional()
  @IsEnum(['general', 'reembolso', 'cambio_datos', 'certificado', 'otro'])
  subcategoria?: string;

  @ApiProperty({ example: 'Solicitud de reembolso' })
  @IsNotEmpty()
  @IsString()
  asunto: string;

  @ApiProperty({ example: 'Solicito el reembolso de mi membresía porque...' })
  @IsNotEmpty()
  @IsString()
  descripcion: string;
}

export class AddPQRSDFMessageDto {
  @ApiProperty({ example: 'Adjunto más información sobre mi solicitud...' })
  @IsNotEmpty()
  @IsString()
  contenido: string;
}

export class UpdatePQRSDFStatusDto {
  @ApiProperty({
    example: 'respondida',
    enum: ['en_revision', 'respondida', 'cerrada', 'escalada'],
  })
  @IsNotEmpty()
  @IsEnum(['en_revision', 'respondida', 'cerrada', 'escalada'])
  estado: string;

  @ApiProperty({ example: 'Se ha revisado su solicitud...' })
  @IsOptional()
  @IsString()
  respuestaFinal?: string;
}
