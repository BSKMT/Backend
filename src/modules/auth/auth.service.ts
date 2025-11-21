import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserDocument } from '../../common/schemas/user.schema';
import { Session, SessionDocument } from './entities/session.schema';
import { RefreshToken, RefreshTokenDocument } from './entities/refresh-token.schema';
import { PasswordResetToken, PasswordResetTokenDocument } from './entities/password-reset-token.schema';
import { EmailVerificationToken, EmailVerificationTokenDocument } from './entities/email-verification-token.schema';
import { RegisterDto } from './dto/register.dto';

// Helper para manejar errores
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const getErrorStack = (error: unknown): string | undefined => {
  if (error instanceof Error) return error.stack;
  return undefined;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshTokenDocument>,
    @InjectModel(PasswordResetToken.name) private passwordResetTokenModel: Model<PasswordResetTokenDocument>,
    @InjectModel(EmailVerificationToken.name) private emailVerificationTokenModel: Model<EmailVerificationTokenDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Validar usuario y contraseña
   */
  async validateUser(email: string, password: string): Promise<any> {
    try {
      const user = await this.userModel.findOne({ email }).select('+password').exec();

      if (!user) {
        this.logger.warn(`Login attempt for non-existent user: ${email}`);
        return null;
      }

      // Verificar si la cuenta está bloqueada
      if (user.isLocked) {
        const now = new Date();
        if (user.lockUntil && user.lockUntil > now) {
          const minutesLeft = Math.ceil((user.lockUntil.getTime() - now.getTime()) / 60000);
          throw new UnauthorizedException(
            `Cuenta bloqueada. Intente nuevamente en ${minutesLeft} minutos.`
          );
        } else {
          // Desbloquear cuenta si ya pasó el tiempo
          await this.userModel.updateOne(
            { _id: user._id },
            { $set: { isLocked: false, loginAttempts: 0, lockUntil: null } }
          );
        }
      }

      // Verificar contraseña
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        // Incrementar intentos fallidos
        await this.handleFailedLogin(user);
        this.logger.warn(`Failed login attempt for user: ${email}`);
        return null;
      }

      // Login exitoso - resetear intentos
      await this.userModel.updateOne(
        { _id: user._id },
        { $set: { loginAttempts: 0, lastLogin: new Date() } }
      );

      // Remover password del objeto retornado
      const { password: _, ...result } = user.toObject();
      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error validating user: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Manejar intentos fallidos de login
   */
  private async handleFailedLogin(user: UserDocument): Promise<void> {
    const maxAttempts = this.configService.get<number>('MAX_LOGIN_ATTEMPTS') || 5;
    const lockDuration = this.configService.get<number>('ACCOUNT_LOCK_DURATION') || 7200; // 2 horas en segundos

    const loginAttempts = (user.loginAttempts || 0) + 1;

    if (loginAttempts >= maxAttempts) {
      const lockUntil = new Date(Date.now() + lockDuration * 1000);
      await this.userModel.updateOne(
        { _id: user._id },
        { $set: { loginAttempts, isLocked: true, lockUntil } }
      );
      this.logger.warn(`Account locked for user: ${user.email}`);
    } else {
      await this.userModel.updateOne(
        { _id: user._id },
        { $set: { loginAttempts } }
      );
    }
  }

  /**
   * Registrar nuevo usuario
   */
  async register(registerDto: RegisterDto, ipAddress: string, userAgent: string): Promise<UserDocument> {
    try {
      // Verificar si el email ya existe
      const existingUser = await this.userModel.findOne({ email: registerDto.email });

      if (existingUser) {
        throw new ConflictException('El email ya está registrado');
      }

      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(registerDto.password, 12);

      // Crear usuario
      const user = new this.userModel({
        ...registerDto,
        password: hashedPassword,
        nombre: registerDto.firstName,
        apellido: registerDto.lastName,
        role: 'user',
        isActive: true,
        emailVerified: false,
      });

      await user.save();

      this.logger.log(`New user registered: ${user.email}`);

      // Generar token de verificación de email
      await this.createEmailVerificationToken(user._id.toString(), user.email, ipAddress, userAgent);

      return user;
    } catch (error) {
      this.logger.error(`Error registering user: ${getErrorMessage(error)}`, getErrorStack(error));
      throw error;
    }
  }

  /**
   * Login - generar tokens y sesión
   */
  async login(
    user: any,
    ipAddress: string,
    userAgent: string,
    deviceFingerprint?: string,
    rememberMe: boolean = false,
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    try {
      const payload = {
        sub: user._id.toString(),
        email: user.email,
        role: user.role,
      };

      // Generar tokens
      const accessToken = this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRATION') || '15m',
      });

      const refreshTokenExpiration = rememberMe ? '30d' : '7d';
      const refreshToken = this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshTokenExpiration,
      });

      // Guardar refresh token
      await this.saveRefreshToken(
        user._id.toString(),
        refreshToken,
        ipAddress,
        userAgent,
        refreshTokenExpiration,
      );

      // Crear sesión
      await this.createSession(
        user._id.toString(),
        accessToken,
        refreshToken,
        ipAddress,
        userAgent,
        deviceFingerprint,
      );

      this.logger.log(`User logged in: ${user.email}`);

      return {
        accessToken,
        refreshToken,
        user: {
          id: user._id.toString(),
          email: user.email,
          nombre: user.nombre,
          apellido: user.apellido,
          role: user.role,
          emailVerified: user.emailVerified,
          profileImage: user.profileImage,
          membershipStatus: user.membershipStatus,
        },
      };
    } catch (error) {
      this.logger.error(`Error during login: ${getErrorMessage(error)}`, getErrorStack(error));
      throw error;
    }
  }

  /**
   * Crear sesión
   */
  private async createSession(
    userId: string,
    accessToken: string,
    refreshToken: string,
    ipAddress: string,
    userAgent: string,
    deviceFingerprint?: string,
  ): Promise<SessionDocument> {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    const session = new this.sessionModel({
      userId,
      accessToken,
      refreshToken,
      ipAddress,
      userAgent,
      deviceFingerprint,
      expiresAt,
      lastActivityAt: new Date(),
    });

    return await session.save();
  }

  /**
   * Guardar refresh token
   */
  private async saveRefreshToken(
    userId: string,
    token: string,
    ipAddress: string,
    userAgent: string,
    expiration: string,
  ): Promise<RefreshTokenDocument> {
    const expirationMs = this.parseExpiration(expiration);
    const expiresAt = new Date(Date.now() + expirationMs);

    const refreshToken = new this.refreshTokenModel({
      userId,
      token,
      ipAddress,
      userAgent,
      expiresAt,
    });

    return await refreshToken.save();
  }

  /**
   * Convertir string de expiración a milisegundos
   */
  private parseExpiration(expiration: string): number {
    const unit = expiration.slice(-1);
    const value = parseInt(expiration.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 15 * 60 * 1000; // 15 minutos por defecto
    }
  }

  /**
   * Validar sesión
   */
  async validateSession(userId: string, accessToken: string): Promise<boolean> {
    try {
      const session = await this.sessionModel.findOne({
        userId,
        accessToken,
        isRevoked: false,
      });

      if (!session) {
        return false;
      }

      // Actualizar última actividad
      await this.sessionModel.updateOne(
        { _id: session._id },
        { $set: { lastActivityAt: new Date() } }
      );

      return true;
    } catch (error) {
      this.logger.error(`Error validating session: ${getErrorMessage(error)}`);
      return false;
    }
  }

  /**
   * Validar refresh token
   */
  async validateRefreshToken(userId: string, token: string): Promise<boolean> {
    try {
      const refreshToken = await this.refreshTokenModel.findOne({
        userId,
        token,
        isRevoked: false,
      });

      if (!refreshToken) {
        return false;
      }

      // Verificar expiración
      if (refreshToken.expiresAt < new Date()) {
        await this.refreshTokenModel.updateOne(
          { _id: refreshToken._id },
          { $set: { isRevoked: true, revokedAt: new Date() } }
        );
        return false;
      }

      // Actualizar última vez usado
      await this.refreshTokenModel.updateOne(
        { _id: refreshToken._id },
        { 
          $set: { lastUsedAt: new Date() },
          $inc: { usageCount: 1 }
        }
      );

      return true;
    } catch (error) {
      this.logger.error(`Error validating refresh token: ${getErrorMessage(error)}`);
      return false;
    }
  }

  /**
   * Refrescar tokens
   */
  async refreshTokens(
    userId: string,
    oldRefreshToken: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Obtener usuario
      const user = await this.userModel.findById(userId);

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Usuario no encontrado o inactivo');
      }

      const payload = {
        sub: user._id.toString(),
        email: user.email,
        role: user.role,
      };

      // Generar nuevos tokens
      const accessToken = this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRATION') || '15m',
      });

      const refreshToken = this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d',
      });

      // Revocar el token antiguo y guardar el nuevo
      await this.refreshTokenModel.updateOne(
        { token: oldRefreshToken },
        { 
          $set: { 
            isRevoked: true, 
            revokedAt: new Date(),
            replacedByToken: refreshToken,
          } 
        }
      );

      await this.saveRefreshToken(
        userId,
        refreshToken,
        ipAddress,
        userAgent,
        '7d',
      );

      // Actualizar sesión
      await this.sessionModel.updateOne(
        { userId, refreshToken: oldRefreshToken },
        { 
          $set: { 
            accessToken, 
            refreshToken,
            lastActivityAt: new Date(),
          } 
        }
      );

      this.logger.log(`Tokens refreshed for user: ${user.email}`);

      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error(`Error refreshing tokens: ${getErrorMessage(error)}`, getErrorStack(error));
      throw error;
    }
  }

  /**
   * Logout
   */
  async logout(userId: string, accessToken: string): Promise<void> {
    try {
      // Revocar sesión
      await this.sessionModel.updateOne(
        { userId, accessToken },
        { 
          $set: { 
            isRevoked: true, 
            revokedAt: new Date(),
            revokedReason: 'User logout',
          } 
        }
      );

      // Revocar refresh token asociado
      const session = await this.sessionModel.findOne({ userId, accessToken });
      if (session) {
        await this.refreshTokenModel.updateOne(
          { token: session.refreshToken },
          { $set: { isRevoked: true, revokedAt: new Date() } }
        );
      }

      this.logger.log(`User logged out: ${userId}`);
    } catch (error) {
      this.logger.error(`Error during logout: ${getErrorMessage(error)}`, getErrorStack(error));
      throw error;
    }
  }

  /**
   * Obtener usuario por ID
   */
  async getUserById(userId: string): Promise<UserDocument | null> {
    return await this.userModel.findById(userId);
  }

  /**
   * Crear token de verificación de email
   */
  async createEmailVerificationToken(
    userId: string,
    email: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    await this.emailVerificationTokenModel.create({
      userId,
      token,
      email,
      expiresAt,
      ipAddress,
      userAgent,
    });

    // TODO: Enviar email con el token
    // await this.emailService.sendVerificationEmail(email, token);

    this.logger.log(`Email verification token created for user: ${userId}`);
    return token;
  }

  /**
   * Verificar email
   */
  async verifyEmail(token: string): Promise<void> {
    const verificationToken = await this.emailVerificationTokenModel.findOne({
      token,
      isUsed: false,
    });

    if (!verificationToken) {
      throw new BadRequestException('Token de verificación inválido o expirado');
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new BadRequestException('Token de verificación expirado');
    }

    // Marcar email como verificado
    await this.userModel.updateOne(
      { _id: verificationToken.userId },
      { $set: { emailVerified: true } }
    );

    // Marcar token como usado
    await this.emailVerificationTokenModel.updateOne(
      { _id: verificationToken._id },
      { $set: { isUsed: true, usedAt: new Date() } }
    );

    this.logger.log(`Email verified for user: ${verificationToken.userId}`);
  }

  /**
   * Solicitar reset de contraseña
   */
  async requestPasswordReset(email: string, ipAddress: string, userAgent: string): Promise<void> {
    const user = await this.userModel.findOne({ email });

    if (!user) {
      // No revelar si el email existe o no
      this.logger.warn(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await this.passwordResetTokenModel.create({
      userId: user._id,
      token,
      expiresAt,
      ipAddress,
      userAgent,
    });

    // TODO: Enviar email con el token
    // await this.emailService.sendPasswordResetEmail(email, token);

    this.logger.log(`Password reset requested for user: ${user.email}`);
  }

  /**
   * Resetear contraseña
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetToken = await this.passwordResetTokenModel.findOne({
      token,
      isUsed: false,
    });

    if (!resetToken) {
      throw new BadRequestException('Token de reset inválido o expirado');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Token de reset expirado');
    }

    // Hash nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Actualizar contraseña
    await this.userModel.updateOne(
      { _id: resetToken.userId },
      { 
        $set: { 
          password: hashedPassword,
          loginAttempts: 0,
          isLocked: false,
          lockUntil: null,
        } 
      }
    );

    // Marcar token como usado
    await this.passwordResetTokenModel.updateOne(
      { _id: resetToken._id },
      { $set: { isUsed: true, usedAt: new Date() } }
    );

    // Revocar todas las sesiones y tokens del usuario
    await this.revokeAllUserSessions(resetToken.userId.toString());

    this.logger.log(`Password reset for user: ${resetToken.userId}`);
  }

  /**
   * Revocar todas las sesiones de un usuario
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.sessionModel.updateMany(
      { userId, isRevoked: false },
      { 
        $set: { 
          isRevoked: true, 
          revokedAt: new Date(),
          revokedReason: 'Password reset',
        } 
      }
    );

    await this.refreshTokenModel.updateMany(
      { userId, isRevoked: false },
      { $set: { isRevoked: true, revokedAt: new Date() } }
    );

    this.logger.log(`All sessions revoked for user: ${userId}`);
  }

  /**
   * Obtener sesiones activas de un usuario
   */
  async getUserActiveSessions(userId: string): Promise<SessionDocument[]> {
    return await this.sessionModel.find({
      userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    }).sort({ lastActivityAt: -1 });
  }

  /**
   * Revocar sesión específica
   */
  async revokeSession(sessionId: string, userId: string): Promise<void> {
    await this.sessionModel.updateOne(
      { _id: sessionId, userId },
      { 
        $set: { 
          isRevoked: true, 
          revokedAt: new Date(),
          revokedReason: 'User revoked',
        } 
      }
    );

    this.logger.log(`Session revoked: ${sessionId} for user: ${userId}`);
  }
}
