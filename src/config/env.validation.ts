import { plainToClass } from 'class-transformer';
import { IsEnum, IsString, IsNumber, validateSync, IsOptional } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Environment variables validation class
 * Ensures all required environment variables are present and valid
 */
class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  PORT: number;

  @IsString()
  API_PREFIX: string;

  @IsString()
  FRONTEND_URL: string;

  // Database
  @IsString()
  MONGODB_URI: string;

  // JWT
  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  JWT_EXPIRES_IN: string;

  @IsString()
  JWT_REFRESH_EXPIRES_IN: string;

  // Redis
  @IsString()
  @IsOptional()
  REDIS_URL?: string;

  @IsString()
  @IsOptional()
  REDIS_HOST?: string;

  @IsNumber()
  @IsOptional()
  REDIS_PORT?: number;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  // Cloudinary
  @IsString()
  @IsOptional()
  CLOUDINARY_CLOUD_NAME?: string;

  @IsString()
  @IsOptional()
  CLOUDINARY_API_KEY?: string;

  @IsString()
  @IsOptional()
  CLOUDINARY_API_SECRET?: string;

  // ReCAPTCHA
  @IsString()
  @IsOptional()
  RECAPTCHA_SECRET_KEY?: string;

  // Email (optional)
  @IsString()
  @IsOptional()
  SMTP_HOST?: string;

  @IsNumber()
  @IsOptional()
  SMTP_PORT?: number;

  @IsString()
  @IsOptional()
  SMTP_USER?: string;

  @IsString()
  @IsOptional()
  SMTP_PASSWORD?: string;

  @IsString()
  @IsOptional()
  EMAIL_FROM?: string;

  // Bold (optional)
  @IsString()
  @IsOptional()
  BOLD_API_KEY?: string;

  @IsString()
  @IsOptional()
  BOLD_SECRET_KEY?: string;

  @IsString()
  @IsOptional()
  BOLD_WEBHOOK_SECRET?: string;

  // MessageBird (optional)
  @IsString()
  @IsOptional()
  MESSAGEBIRD_API_KEY?: string;

  // Two-Factor
  @IsString()
  @IsOptional()
  TWO_FACTOR_SECRET?: string;

  // Security
  @IsString()
  @IsOptional()
  ENCRYPTION_KEY?: string;

  @IsString()
  @IsOptional()
  CSRF_SECRET?: string;

  // CORS
  @IsString()
  CORS_ORIGIN: string;
}

/**
 * Validates environment variables
 * Throws an error if validation fails
 */
export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
