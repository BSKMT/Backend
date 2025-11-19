import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class UploadsService {
  constructor(private configService: ConfigService) {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'bskmt',
    filename?: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadOptions: any = {
        folder,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [
          { width: 2000, height: 2000, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
      };

      if (filename) {
        uploadOptions.public_id = filename;
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) return reject(error);
          resolve(result as UploadApiResponse);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  async uploadPdf(
    file: Express.Multer.File,
    folder: string = 'bskmt/documents',
    filename?: string,
  ): Promise<UploadApiResponse> {
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed');
    }

    return new Promise((resolve, reject) => {
      const uploadOptions: any = {
        folder,
        resource_type: 'raw',
        allowed_formats: ['pdf'],
      };

      if (filename) {
        uploadOptions.public_id = filename;
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) return reject(error);
          resolve(result as UploadApiResponse);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  async uploadProfileImage(
    file: Express.Multer.File,
    userId: string,
  ): Promise<UploadApiResponse> {
    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only images are allowed.');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    const filename = `user-${userId}-${Date.now()}`;
    return this.uploadImage(file, 'bskmt/profiles', filename);
  }

  async uploadEventImage(
    file: Express.Multer.File,
    eventId?: string,
  ): Promise<UploadApiResponse> {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only images are allowed.');
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    const filename = eventId ? `event-${eventId}-${Date.now()}` : undefined;
    return this.uploadImage(file, 'bskmt/events', filename);
  }

  async uploadDocument(
    file: Express.Multer.File,
    userId: string,
    documentType: string,
  ): Promise<UploadApiResponse> {
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF documents are allowed');
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    const filename = `user-${userId}-${documentType}-${Date.now()}`;
    return this.uploadPdf(file, 'bskmt/documents', filename);
  }

  async deleteFile(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      throw new BadRequestException('Error deleting file from Cloudinary');
    }
  }

  async deleteRawFile(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'raw',
      });
      return result;
    } catch (error) {
      throw new BadRequestException('Error deleting file from Cloudinary');
    }
  }

  async getImageUrl(publicId: string, transformation?: any): Promise<string> {
    return cloudinary.url(publicId, {
      secure: true,
      ...transformation,
    });
  }

  async getThumbnailUrl(publicId: string): Promise<string> {
    return cloudinary.url(publicId, {
      secure: true,
      transformation: [
        { width: 300, height: 300, crop: 'fill' },
        { quality: 'auto:low' },
      ],
    });
  }

  validateImageFile(file: Express.Multer.File): void {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed types: JPEG, PNG, WebP, GIF',
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }
  }

  validatePdfFile(file: Express.Multer.File): void {
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Invalid file type. Only PDF files are allowed');
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }
  }
}
