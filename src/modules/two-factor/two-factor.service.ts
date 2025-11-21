import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { User, UserDocument } from '../../common/schemas/user.schema';

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  /**
   * Generar secreto TOTP para un usuario
   */
  async generateSecret(userId: string): Promise<{ secret: string; qrCodeUrl: string; manualEntryKey: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA ya está habilitado. Desactívalo primero.');
    }

    // Generar secreto con speakeasy
    const secret = speakeasy.generateSecret({
      name: `BSK Motorcycle Team (${user.email})`,
      issuer: 'BSK Motorcycle Team',
      length: 32,
    });

    // Guardar secreto temporalmente (sin activar 2FA aún)
    await this.userModel.updateOne(
      { _id: userId },
      { $set: { twoFactorSecret: secret.base32 } }
    );

    // Generar QR code
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);

    this.logger.log(`2FA secret generated for user: ${userId}`);

    return {
      secret: secret.base32,
      qrCodeUrl: qrCodeDataUrl,
      manualEntryKey: secret.base32,
    };
  }

  /**
   * Verificar código TOTP y activar 2FA
   */
  async enableTwoFactor(userId: string, token: string): Promise<{ backupCodes: string[] }> {
    const user = await this.userModel.findById(userId).select('+twoFactorSecret');
    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('Primero debes generar un secreto 2FA');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA ya está habilitado');
    }

    // Verificar token TOTP
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2, // Permite +/- 2 períodos de tiempo (60 segundos)
    });

    if (!isValid) {
      throw new UnauthorizedException('Código de verificación inválido');
    }

    // Generar códigos de respaldo (10 códigos de 8 caracteres)
    const backupCodes = this.generateBackupCodes(10);
    const hashedBackupCodes = backupCodes.map(code => this.hashBackupCode(code));

    // Activar 2FA y guardar códigos
    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          twoFactorEnabled: true,
          backupCodes: hashedBackupCodes,
        }
      }
    );

    this.logger.log(`2FA enabled for user: ${userId}`);

    return { backupCodes };
  }

  /**
   * Verificar código TOTP durante login
   */
  async verifyTOTP(userId: string, token: string): Promise<boolean> {
    const user = await this.userModel.findById(userId).select('+twoFactorSecret');
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return false;
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (isValid) {
      this.logger.log(`TOTP verified successfully for user: ${userId}`);
    } else {
      this.logger.warn(`TOTP verification failed for user: ${userId}`);
    }

    return isValid;
  }

  /**
   * Verificar código de respaldo
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await this.userModel.findById(userId);
    if (!user || !user.twoFactorEnabled || !user.backupCodes || user.backupCodes.length === 0) {
      return false;
    }

    const hashedCode = this.hashBackupCode(code);
    const codeIndex = user.backupCodes.indexOf(hashedCode);

    if (codeIndex === -1) {
      this.logger.warn(`Invalid backup code attempt for user: ${userId}`);
      return false;
    }

    // Remover código usado (uso único)
    await this.userModel.updateOne(
      { _id: userId },
      { $pull: { backupCodes: hashedCode } }
    );

    this.logger.log(`Backup code used for user: ${userId}. Remaining: ${user.backupCodes.length - 1}`);

    // Alerta si quedan pocos códigos
    if (user.backupCodes.length - 1 <= 2) {
      this.logger.warn(`User ${userId} has only ${user.backupCodes.length - 1} backup codes remaining`);
    }

    return true;
  }

  /**
   * Desactivar 2FA
   */
  async disableTwoFactor(userId: string, verificationCode: string): Promise<void> {
    const user = await this.userModel.findById(userId).select('+twoFactorSecret');
    if (!user || !user.twoFactorEnabled) {
      throw new BadRequestException('2FA no está habilitado');
    }

    // Verificar código TOTP o backup antes de desactivar
    const isTOTPValid = await this.verifyTOTP(userId, verificationCode);
    const isBackupValid = !isTOTPValid && await this.verifyBackupCode(userId, verificationCode);

    if (!isTOTPValid && !isBackupValid) {
      throw new UnauthorizedException('Código de verificación inválido');
    }

    // Desactivar 2FA y limpiar datos
    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          backupCodes: [],
        }
      }
    );

    this.logger.log(`2FA disabled for user: ${userId}`);
  }

  /**
   * Regenerar códigos de respaldo
   */
  async regenerateBackupCodes(userId: string): Promise<{ backupCodes: string[] }> {
    const user = await this.userModel.findById(userId);
    if (!user || !user.twoFactorEnabled) {
      throw new BadRequestException('2FA no está habilitado');
    }

    const backupCodes = this.generateBackupCodes(10);
    const hashedBackupCodes = backupCodes.map(code => this.hashBackupCode(code));

    await this.userModel.updateOne(
      { _id: userId },
      { $set: { backupCodes: hashedBackupCodes } }
    );

    this.logger.log(`Backup codes regenerated for user: ${userId}`);

    return { backupCodes };
  }

  /**
   * Verificar si el usuario tiene 2FA habilitado
   */
  async isTwoFactorEnabled(userId: string): Promise<boolean> {
    const user = await this.userModel.findById(userId);
    return user?.twoFactorEnabled || false;
  }

  /**
   * Obtener número de códigos de respaldo restantes
   */
  async getRemainingBackupCodes(userId: string): Promise<number> {
    const user = await this.userModel.findById(userId);
    return user?.backupCodes?.length || 0;
  }

  /**
   * Generar códigos de respaldo aleatorios
   */
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generar código alfanumérico de 8 caracteres (ej: A3B7C9D2)
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Hashear código de respaldo para almacenamiento seguro
   */
  private hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
  }

  /**
   * Validar formato de código TOTP (6 dígitos)
   */
  validateTOTPFormat(token: string): boolean {
    return /^\d{6}$/.test(token);
  }

  /**
   * Validar formato de código de respaldo (8 caracteres hex)
   */
  validateBackupCodeFormat(code: string): boolean {
    return /^[A-F0-9]{8}$/i.test(code);
  }
}
