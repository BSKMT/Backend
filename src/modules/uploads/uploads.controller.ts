import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { DeleteFileDto } from './dto/upload.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  // Public endpoint for registration image upload
  @Post('public/image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image (public, for registration)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          description: 'Optional folder name',
        },
        publicId: {
          type: 'string',
          description: 'Optional public ID',
        },
        preserveOriginalSize: {
          type: 'boolean',
          description: 'Preserve original image size',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Image uploaded successfully' })
  async uploadPublicImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
    @Body('publicId') publicId?: string,
    @Body('preserveOriginalSize') preserveOriginalSize?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    this.uploadsService.validateImageFile(file);
    
    // Use custom filename if provided
    const result = await this.uploadsService.uploadImage(
      file, 
      folder || 'user-profiles',
      publicId,
    );

    return {
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
      },
    };
  }

  @Post('image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          description: 'Optional folder name',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Image uploaded successfully' })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    this.uploadsService.validateImageFile(file);
    const result = await this.uploadsService.uploadImage(file, folder);

    return {
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
      },
    };
  }

  @Post('profile-image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload profile image' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Profile image uploaded successfully' })
  async uploadProfileImage(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.uploadsService.uploadProfileImage(file, req.user.userId);
    const thumbnailUrl = await this.uploadsService.getThumbnailUrl(result.public_id);

    return {
      success: true,
      message: 'Profile image uploaded successfully',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        thumbnailUrl,
      },
    };
  }

  @Post('event-image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload event image' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        eventId: {
          type: 'string',
          description: 'Optional event ID',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Event image uploaded successfully' })
  async uploadEventImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('eventId') eventId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.uploadsService.uploadEventImage(file, eventId);
    const thumbnailUrl = await this.uploadsService.getThumbnailUrl(result.public_id);

    return {
      success: true,
      message: 'Event image uploaded successfully',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        thumbnailUrl,
      },
    };
  }

  @Post('pdf')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a PDF document' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          description: 'Optional folder name',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'PDF uploaded successfully' })
  async uploadPdf(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    this.uploadsService.validatePdfFile(file);
    const result = await this.uploadsService.uploadPdf(file, folder);

    return {
      success: true,
      message: 'PDF uploaded successfully',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        bytes: result.bytes,
      },
    };
  }

  @Post('document')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a document (PDF)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        documentType: {
          type: 'string',
          description: 'Type of document (e.g., license, soat, etc.)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('documentType') documentType: string,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!documentType) {
      throw new BadRequestException('Document type is required');
    }

    const result = await this.uploadsService.uploadDocument(
      file,
      req.user.userId,
      documentType,
    );

    return {
      success: true,
      message: 'Document uploaded successfully',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        bytes: result.bytes,
      },
    };
  }

  @Delete('file')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a file from Cloudinary' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  async deleteFile(@Body() deleteFileDto: DeleteFileDto) {
    const result = await this.uploadsService.deleteFile(deleteFileDto.publicId);

    return {
      success: true,
      message: 'File deleted successfully',
      data: result,
    };
  }

  @Delete('raw-file')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a raw file (PDF) from Cloudinary' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  async deleteRawFile(@Body() deleteFileDto: DeleteFileDto) {
    const result = await this.uploadsService.deleteRawFile(deleteFileDto.publicId);

    return {
      success: true,
      message: 'File deleted successfully',
      data: result,
    };
  }
}
