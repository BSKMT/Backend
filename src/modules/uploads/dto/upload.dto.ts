import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';

export class UploadResponseDto {
  @ApiProperty({ example: 'https://res.cloudinary.com/...' })
  url: string;

  @ApiProperty({ example: 'abc123xyz' })
  publicId: string;

  @ApiProperty({ example: 'image/jpeg' })
  format: string;

  @ApiProperty({ example: 1024 })
  width?: number;

  @ApiProperty({ example: 768 })
  height?: number;

  @ApiProperty({ example: 204800 })
  bytes: number;

  @ApiProperty({ example: 'https://res.cloudinary.com/.../thumbnail.jpg' })
  thumbnailUrl?: string;
}

export class DeleteFileDto {
  @ApiProperty({ example: 'abc123xyz' })
  @IsNotEmpty()
  @IsString()
  publicId: string;
}

export class UploadOptionsDto {
  @ApiProperty({ example: 'profile-images', required: false })
  @IsOptional()
  @IsString()
  folder?: string;

  @ApiProperty({ example: 'user-123-avatar', required: false })
  @IsOptional()
  @IsString()
  filename?: string;

  @ApiProperty({ example: 'auto', required: false, enum: ['auto', 'image', 'video', 'raw'] })
  @IsOptional()
  @IsEnum(['auto', 'image', 'video', 'raw'])
  resourceType?: string;
}
