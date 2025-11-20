import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { User, UserDocument } from '../../common/schemas/user.schema';
import { Session, SessionDocument } from '../../common/schemas/session.schema';
import { LoginDto, RegisterDto } from '../../common/dto/auth.dto';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string): Promise<UserDocument | null> {
    const user = await this.userModel.findOne({ email }).select('+password').exec();

    if (!user) {
      return null;
    }

    // Check if account is locked
    if (user.isAccountLocked && user.isAccountLocked()) {
      throw new UnauthorizedException('Cuenta bloqueada por múltiples intentos fallidos');
    }

    // Verify password
    const isPasswordValid = user.comparePassword ? await user.comparePassword(password) : false;

    if (!isPasswordValid) {
      // Increment login attempts
      if (user.incrementLoginAttempts) {
        await user.incrementLoginAttempts();
      }
      return null;
    }

    // Reset login attempts on successful login
    if (user.resetLoginAttempts) {
      await user.resetLoginAttempts();
    }

    return user;
  }

  /**
   * Login user and generate tokens
   */
  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    // Generate tokens
    const payload = { sub: user._id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.generateRefreshToken();

    // Save session
    await this.createSession(user._id.toString(), refreshToken);

    // Update last login
    if (user.updateLastLogin) {
      await user.updateLastLogin();
    }

    return {
      success: true,
      user: user.getPublicProfile ? user.getPublicProfile() : user.toObject(),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Register new user
   */
  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUserEmail = await this.userModel.findOne({ email: registerDto.email });
    if (existingUserEmail) {
      throw new ConflictException('El email ya está registrado');
    }

    const existingUserDoc = await this.userModel.findOne({
      documentNumber: registerDto.documentNumber,
    });
    if (existingUserDoc) {
      throw new ConflictException('El número de documento ya está registrado');
    }

    // Validate terms acceptance (check both field naming conventions)
    const hasAcceptedTerms = registerDto.acceptedTerms || registerDto.termsAcceptance;
    const hasAcceptedPrivacy = registerDto.acceptedPrivacyPolicy || registerDto.dataConsent;
    const hasAcceptedDataProcessing = registerDto.acceptedDataProcessing || registerDto.liabilityWaiver;
    
    if (!hasAcceptedTerms || !hasAcceptedPrivacy || !hasAcceptedDataProcessing) {
      throw new BadRequestException('Debe aceptar todos los términos y condiciones');
    }

    // Create new user
    const user = new this.userModel(registerDto);
    await user.save();

    // Generate email verification token
    const verificationToken = this.generateVerificationToken();
    user.emailVerificationToken = verificationToken;
    await user.save();

    // TODO: Send verification email

    return {
      success: true,
      message: 'Usuario registrado exitosamente. Por favor verifica tu email.',
      user: user.getPublicProfile ? user.getPublicProfile() : user.toObject(),
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    const session = await this.sessionModel.findOne({ refreshToken, isActive: true });

    if (!session) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (session.expiresAt < new Date()) {
      await session.updateOne({ isActive: false });
      throw new UnauthorizedException('Refresh token expirado');
    }

    const user = await this.userModel.findById(session.userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    // Generate new access token
    const payload = { sub: user._id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      success: true,
      accessToken,
    };
  }

  /**
   * Logout user
   */
  async logout(userId: string, refreshToken: string) {
    await this.sessionModel.updateOne(
      { userId, refreshToken },
      { isActive: false },
    );

    return {
      success: true,
      message: 'Sesión cerrada exitosamente',
    };
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string) {
    const user = await this.userModel.findOne({ emailVerificationToken: token });

    if (!user) {
      throw new BadRequestException('Token de verificación inválido');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    return {
      success: true,
      message: 'Email verificado exitosamente',
    };
  }

  /**
   * Forgot password - send reset email
   */
  async forgotPassword(email: string) {
    const user = await this.userModel.findOne({ email });

    if (!user) {
      // Don't reveal if user exists
      return {
        success: true,
        message: 'Si el email existe, recibirás instrucciones para resetear tu contraseña',
      };
    }

    // Generate reset token
    const resetToken = this.generateResetToken();
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // TODO: Send password reset email

    return {
      success: true,
      message: 'Si el email existe, recibirás instrucciones para resetear tu contraseña',
    };
  }

  /**
   * Reset password
   */
  async resetPassword(token: string, newPassword: string) {
    const user = await this.userModel.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Token de reset inválido o expirado');
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Invalidate all sessions
    await this.sessionModel.updateMany(
      { userId: user._id },
      { isActive: false },
    );

    return {
      success: true,
      message: 'Contraseña actualizada exitosamente',
    };
  }

  /**
   * Helper: Create session
   */
  private async createSession(userId: string, refreshToken: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const session = new this.sessionModel({
      userId,
      refreshToken,
      expiresAt,
      isActive: true,
    });

    await session.save();
  }

  /**
   * Helper: Generate refresh token
   */
  private generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Helper: Generate verification token
   */
  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Helper: Generate reset token
   */
  private generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
