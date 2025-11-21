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
import { EmailQueueService } from '../queue/email-queue.service';
import { AuditService } from '../audit/audit.service';
import { TwoFactorService } from '../two-factor/two-factor.service';
import { DeviceService } from '../devices/device.service';
import { SecurityService } from '../security/security.service';

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
    private emailQueueService: EmailQueueService,
    private auditService: AuditService,
    private twoFactorService: TwoFactorService,
    private deviceService: DeviceService,
    private securityService: SecurityService,
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
        // Registrar intento fallido en auditoría
        await this.auditService.logLoginFailure(email, 'unknown', 'unknown', 'Invalid password');
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

      // Registrar en auditoría
      await this.auditService.logRegister(user._id.toString(), user.email, ipAddress, userAgent);

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

      // Generar tokens con RS256 (usa configuración del módulo)
      const accessToken = this.jwtService.sign(payload);

      // Refresh token con expiración extendida
      const refreshTokenExpiration = rememberMe ? '30d' : '7d';
      const refreshToken = this.jwtService.sign(
        { ...payload, type: 'refresh' },
        { expiresIn: refreshTokenExpiration }
      );

      // Guardar refresh token
      await this.saveRefreshToken(
        user._id.toString(),
        refreshToken,
        ipAddress,
        userAgent,
        refreshTokenExpiration,
      );

      // Crear sesión
      const session = await this.createSession(
        user._id.toString(),
        accessToken,
        refreshToken,
        ipAddress,
        userAgent,
        deviceFingerprint,
      );

      this.logger.log(`User logged in: ${user.email}`);

      // Registrar login exitoso en auditoría
      await this.auditService.logLoginSuccess(
        user._id.toString(),
        user.email,
        ipAddress,
        userAgent,
        session._id.toString()
      );

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
   * Validar seguridad antes del login
   */
  async validateLoginSecurity(
    userId: string,
    email: string,
    userName: string,
    ipAddress: string,
    userAgent: string,
    deviceFingerprint?: string,
  ): Promise<{ 
    allowed: boolean; 
    requires2FA: boolean; 
    requiresDeviceTrust: boolean;
    riskScore: number; 
    alerts: string[] 
  }> {
    // Analizar con SecurityService
    const securityAnalysis = await this.securityService.analyzeLoginAttempt({
      userId,
      email,
      userName,
      ipAddress,
      userAgent,
      deviceFingerprint,
    });

    if (!securityAnalysis.allowed) {
      return {
        allowed: false,
        requires2FA: true,
        requiresDeviceTrust: false,
        riskScore: securityAnalysis.riskScore,
        alerts: securityAnalysis.alerts,
      };
    }

    // Verificar si el usuario tiene 2FA habilitado
    const has2FA = await this.twoFactorService.isTwoFactorEnabled(userId);

    // Verificar si el dispositivo es confiable
    const isDeviceTrusted = deviceFingerprint 
      ? await this.deviceService.isDeviceTrusted(userId, deviceFingerprint)
      : false;

    // Si tiene 2FA habilitado y el dispositivo no es confiable, requerir 2FA
    const requires2FA = has2FA && !isDeviceTrusted;

    // Si es un dispositivo nuevo y el score de riesgo es alto, requerir trust
    const isNewDevice = deviceFingerprint
      ? await this.deviceService.isNewDevice(userId, deviceFingerprint)
      : false;
    const requiresDeviceTrust = isNewDevice && securityAnalysis.riskScore >= 40;

    return {
      allowed: true,
      requires2FA,
      requiresDeviceTrust,
      riskScore: securityAnalysis.riskScore,
      alerts: securityAnalysis.alerts,
    };
  }

  /**
   * Verificar código 2FA durante login
   */
  async verify2FACode(userId: string, code: string): Promise<boolean> {
    return this.twoFactorService.verifyTOTP(userId, code) || 
           this.twoFactorService.verifyBackupCode(userId, code);
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

      // Generar nuevos tokens con RS256
      const accessToken = this.jwtService.sign(payload);

      const refreshToken = this.jwtService.sign(
        { ...payload, type: 'refresh' },
        { expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d' }
      );

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

      // Registrar logout en auditoría
      const user = await this.userModel.findById(userId);
      if (user && session) {
        await this.auditService.logLogout(
          userId,
          user.email,
          session.ipAddress || 'unknown',
          session.userAgent || 'unknown',
          session._id.toString()
        );
      }
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

    // Enviar email de verificación a través de la cola
    const user = await this.userModel.findById(userId);
    if (user) {
      await this.emailQueueService.sendVerificationEmail(email, token, user.nombre || email);
    }

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

    // Registrar verificación en auditoría
    const user = await this.userModel.findById(verificationToken.userId);
    if (user) {
      await this.auditService.logEmailVerification(
        verificationToken.userId.toString(),
        user.email,
        verificationToken.ipAddress,
        verificationToken.userAgent
      );
    }
  }

  /**
   * Reenviar email de verificación
   */
  async resendVerificationEmail(userId: string, ipAddress: string, userAgent: string): Promise<void> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    if (user.emailVerified) {
      throw new BadRequestException('El email ya está verificado');
    }

    // Invalidar tokens anteriores
    await this.emailVerificationTokenModel.updateMany(
      { userId, isUsed: false },
      { $set: { isUsed: true, usedAt: new Date() } }
    );

    // Crear nuevo token y enviar email
    await this.createEmailVerificationToken(userId, user.email, ipAddress, userAgent);

    this.logger.log(`Verification email resent for user: ${userId}`);
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

    // Enviar email de reset a través de la cola
    await this.emailQueueService.sendPasswordResetEmail(email, token, user.nombre || email);

    this.logger.log(`Password reset requested for user: ${user.email}`);

    // Registrar solicitud en auditoría
    await this.auditService.logPasswordResetRequest(
      user._id.toString(),
      user.email,
      ipAddress,
      userAgent
    );
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

    // Enviar email de notificación de cambio de contraseña
    const user = await this.userModel.findById(resetToken.userId);
    if (user) {
      await this.emailQueueService.sendPasswordChangedEmail(
        user.email,
        user.nombre || user.email,
        resetToken.ipAddress || 'unknown'
      );

      // Registrar cambio de contraseña en auditoría
      await this.auditService.logPasswordChange(
        user._id.toString(),
        user.email,
        resetToken.ipAddress || 'unknown',
        resetToken.userAgent || 'unknown',
        'reset'
      );
    }

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
