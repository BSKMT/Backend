import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsOptional, IsBoolean, IsEnum, IsArray } from 'class-validator';

export class CreateMembershipDto {
  @ApiProperty({ example: 'Membresía Oro' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'oro' })
  @IsNotEmpty()
  @IsString()
  slug: string;

  @ApiProperty({ example: 'Membresía con beneficios premium' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ example: 'Incluye eventos exclusivos' })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiProperty({
    example: {
      initial: 100000,
      withDiscount: 90000,
      early_bird: 85000,
    },
  })
  @IsNotEmpty()
  pricing: {
    initial: number;
    withDiscount?: number;
    early_bird?: number;
    student?: number;
    family?: number;
    corporate?: number;
  };

  @ApiProperty({ example: ['Acceso a eventos', 'Descuentos en tienda'] })
  @IsArray()
  @IsString({ each: true })
  benefits: string[];

  @ApiProperty({ example: ['feature1', 'feature2'] })
  @IsArray()
  @IsString({ each: true })
  features: string[];

  @ApiProperty({ example: 12 })
  @IsNumber()
  durationMonths: number;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: 'Oro' })
  @IsOptional()
  @IsString()
  categoryName?: string;

  @ApiProperty({ example: 2 })
  @IsOptional()
  @IsNumber()
  categoryLevel?: number;
}

export class UpdateMembershipDto {
  @ApiProperty({ example: 'Membresía Oro Plus' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Membresía con beneficios premium actualizados' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Incluye más eventos exclusivos' })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiProperty({
    example: {
      initial: 110000,
      withDiscount: 100000,
    },
  })
  @IsOptional()
  pricing?: {
    initial?: number;
    withDiscount?: number;
    early_bird?: number;
    student?: number;
    family?: number;
    corporate?: number;
  };

  @ApiProperty({ example: ['Acceso a eventos', 'Descuentos en tienda', 'Regalo anual'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @ApiProperty({ example: ['feature1', 'feature2', 'feature3'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiProperty({ example: 12 })
  @IsOptional()
  @IsNumber()
  durationMonths?: number;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ApplyMembershipDto {
  @ApiProperty({ example: '60a7b3b3b3b3b3b3b3b3b3b3' })
  @IsNotEmpty()
  @IsString()
  membershipId: string;

  @ApiProperty({ example: 'initial', enum: ['initial', 'withDiscount', 'early_bird', 'student', 'family', 'corporate'] })
  @IsNotEmpty()
  @IsEnum(['initial', 'withDiscount', 'early_bird', 'student', 'family', 'corporate'])
  pricingType: string;

  @ApiProperty({ example: 'credit_card' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
