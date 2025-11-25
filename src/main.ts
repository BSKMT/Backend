import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));
  app.use(cookieParser(configService.get<string>('COOKIE_SECRET')));

  // CSRF protection middleware
  const csrfMiddleware = new CsrfMiddleware();
  app.use((req: any, res: any, next: any) => csrfMiddleware.use(req, res, next));

  // CORS configuration
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const corsOrigin = configService.get<string>('CORS_ORIGIN') ||
    (isProduction ? 'https://bskmt.com' : 'http://localhost:3000');
  const allowedOrigins = corsOrigin.split(',').map(origin => origin.trim());

  console.log(`🌍 CORS Configuration:`)
  console.log(`   - Environment: ${isProduction ? 'production' : 'development'}`)
  console.log(`   - Allowed Origins: ${allowedOrigins.join(', ')}`);

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (mobile apps, Postman, etc)
      if (!origin) {
        return callback(null, true);
      }

      // Verificar si el origin está en la lista permitida
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }

      // Rechazar origin no permitido
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-Requested-With',
      'X-Device-Fingerprint',
      'X-Client-Version',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['X-CSRF-Token', 'Set-Cookie'],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Global prefix
  const apiPrefix = configService.get<string>('API_PREFIX') || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // API versioning
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('BSK MT API')
    .setDescription('Backend API for BSK MT Platform - Mountain Biking Community')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('admin', 'Admin operations')
    .addTag('memberships', 'Membership management')
    .addTag('events', 'Event management')
    .addTag('benefits', 'Benefits management')
    .addTag('community', 'Community features')
    .addTag('contact', 'Contact and PQRSDF')
    .addTag('webhooks', 'External webhooks')
    .addTag('uploads', 'File uploads')
    .addTag('health', 'Health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get<number>('PORT') || 4000;
  await app.listen(port);

  console.log(`
    🚀 BSK MT Backend is running!
    📡 API: http://localhost:${port}/${apiPrefix}
    📚 Swagger Docs: http://localhost:${port}/api/docs
    🌍 Environment: ${configService.get<string>('NODE_ENV')}
  `);
}

bootstrap();
