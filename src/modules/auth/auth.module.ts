import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User, UserSchema } from '../../common/schemas/user.schema';
import { Session, SessionSchema } from './entities/session.schema';
import { RefreshToken, RefreshTokenSchema } from './entities/refresh-token.schema';
import { PasswordResetToken, PasswordResetTokenSchema } from './entities/password-reset-token.schema';
import { EmailVerificationToken, EmailVerificationTokenSchema } from './entities/email-verification-token.schema';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { QueueModule } from '../queue/queue.module';
import { AuditModule } from '../audit/audit.module';
import { TwoFactorModule } from '../two-factor/two-factor.module';
import { DeviceModule } from '../devices/device.module';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        // Obtener llaves RSA (base64 o rutas de archivos)
        const privateKeyBase64 = configService.get<string>('JWT_PRIVATE_KEY');
        const publicKeyBase64 = configService.get<string>('JWT_PUBLIC_KEY');
        const privateKeyPath = configService.get<string>('JWT_PRIVATE_KEY_PATH');
        const publicKeyPath = configService.get<string>('JWT_PUBLIC_KEY_PATH');

        let privateKey: string;
        let publicKey: string;

        // Opción 1: Usar llaves en base64 desde variables de entorno
        if (privateKeyBase64 && publicKeyBase64) {
          privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf-8');
          publicKey = Buffer.from(publicKeyBase64, 'base64').toString('utf-8');
        }
        // Opción 2: Leer llaves desde archivos
        else if (privateKeyPath && publicKeyPath) {
          const fs = require('fs');
          const path = require('path');
          privateKey = fs.readFileSync(path.resolve(privateKeyPath), 'utf-8');
          publicKey = fs.readFileSync(path.resolve(publicKeyPath), 'utf-8');
        }
        // Fallback: Usar secret simétrico (legacy)
        else {
          console.warn('⚠️  JWT RSA keys not configured, using legacy HS256');
          return {
            secret: configService.get<string>('JWT_SECRET'),
            signOptions: {
              expiresIn: configService.get<string>('JWT_EXPIRATION') || '15m',
            },
          };
        }

        return {
          privateKey,
          publicKey,
          signOptions: {
            algorithm: 'RS256',
            expiresIn: configService.get<string>('JWT_EXPIRATION') || '15m',
          },
          verifyOptions: {
            algorithms: ['RS256'],
          },
        };
      },
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Session.name, schema: SessionSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: PasswordResetToken.name, schema: PasswordResetTokenSchema },
      { name: EmailVerificationToken.name, schema: EmailVerificationTokenSchema },
    ]),
    QueueModule,
    AuditModule,
    TwoFactorModule,
    DeviceModule,
    SecurityModule,
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    JwtRefreshStrategy,
  ],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
