import {
  IsString,
  IsNotEmpty,
  IsDate,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsBoolean,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class LocationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  coordinates?: {
    lat: number;
    lng: number;
  };
}

class OrganizerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  email: string;
}

export class CreateEventDto {
  @ApiProperty({ description: 'Event name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Event start date' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  startDate: Date;

  @ApiProperty({ description: 'Event end date', required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiProperty({ description: 'Short description', maxLength: 1000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;

  @ApiProperty({ description: 'Long description', required: false, maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  longDescription?: string;

  @ApiProperty({ description: 'Main image URL' })
  @IsString()
  @IsNotEmpty()
  mainImage: string;

  @ApiProperty({ description: 'Gallery images', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gallery?: string[];

  @ApiProperty({ description: 'Details PDF URL', required: false })
  @IsOptional()
  @IsString()
  detailsPdf?: string;

  @ApiProperty({ description: 'Event type' })
  @IsString()
  @IsNotEmpty()
  eventType: string;

  @ApiProperty({ enum: ['draft', 'published', 'cancelled', 'completed'], default: 'published' })
  @IsOptional()
  @IsEnum(['draft', 'published', 'cancelled', 'completed'])
  status?: string;

  @ApiProperty({ type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  @IsNotEmpty()
  departureLocation: LocationDto;

  @ApiProperty({ type: LocationDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  arrivalLocation?: LocationDto;

  @ApiProperty({ description: 'Maximum participants', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxParticipants?: number;

  @ApiProperty({ description: 'Registration open date', required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  registrationOpenDate?: Date;

  @ApiProperty({ description: 'Registration deadline', required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  registrationDeadline?: Date;

  @ApiProperty({ description: 'Price for members', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ description: 'Price for non-members', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  nonMemberPrice?: number;

  @ApiProperty({ description: 'Included services', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includedServices?: string[];

  @ApiProperty({ description: 'Requirements', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @ApiProperty({ enum: ['beginner', 'intermediate', 'advanced', 'expert'], required: false })
  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'advanced', 'expert'])
  difficulty?: string;

  @ApiProperty({ description: 'Distance in kilometers', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  distance?: number;

  @ApiProperty({ description: 'Duration in hours', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiProperty({ description: 'Points awarded', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pointsAwarded?: number;

  @ApiProperty({ type: OrganizerDto })
  @ValidateNested()
  @Type(() => OrganizerDto)
  @IsNotEmpty()
  organizer: OrganizerDto;

  @ApiProperty({ description: 'Tags', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Is active', default: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateEventDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  longDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mainImage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gallery?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  detailsPdf?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(['draft', 'published', 'cancelled', 'completed'])
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  departureLocation?: LocationDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  arrivalLocation?: LocationDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxParticipants?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  registrationOpenDate?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  registrationDeadline?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  nonMemberPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includedServices?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'advanced', 'expert'])
  difficulty?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  distance?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pointsAwarded?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrganizerDto)
  organizer?: OrganizerDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class RegisterToEventDto {
  @ApiProperty({ description: 'User ID to register' })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
