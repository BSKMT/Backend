import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  UseGuards, 
  HttpCode, 
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TwoFactorService } from './two-factor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuditService } from '../audit/audit.service';

class Enable2FADto {
  token: string;
}

class Verify2FADto {
  token: string;
}

class Disable2FADto {
  verificationCode: string;
}

@ApiTags('two-factor')
@Controller('two-factor')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TwoFactorController {
  constructor(
    private readonly twoFactorService: TwoFactorService,
    private readonly auditService: AuditService,
  ) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generar secreto 2FA y QR code' })
  @ApiResponse({ status: 200, description: 'Secreto y QR generados exitosamente' })
  async generate(@GetUser() user: any) {
    const result = await this.twoFactorService.generateSecret(user.userId);
    
    await this.auditService.log({
      userId: user.userId,
      email: user.email,
      action: '2fa-generate-secret',
      status: 'success',
    });

    return {
      success: true,
      data: {
        qrCodeUrl: result.qrCodeUrl,
        manualEntryKey: result.manualEntryKey,
      },
      message: 'Escanea el QR code con tu app de autenticación',
    };
  }

  @Post('enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Habilitar 2FA verificando código TOTP' })
  @ApiResponse({ status: 200, description: '2FA habilitado exitosamente' })
  @ApiResponse({ status: 401, description: 'Código de verificación inválido' })
  async enable(@GetUser() user: any, @Body() dto: Enable2FADto) {
    if (!this.twoFactorService.validateTOTPFormat(dto.token)) {
      throw new BadRequestException('El código debe tener 6 dígitos');
    }

    const result = await this.twoFactorService.enableTwoFactor(user.userId, dto.token);
    
    await this.auditService.log({
      userId: user.userId,
      email: user.email,
      action: '2fa-enabled',
      status: 'success',
    });

    return {
      success: true,
      data: {
        backupCodes: result.backupCodes,
      },
      message: '2FA habilitado exitosamente. Guarda estos códigos de respaldo en un lugar seguro.',
    };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar código 2FA (TOTP o backup)' })
  @ApiResponse({ status: 200, description: 'Código verificado exitosamente' })
  @ApiResponse({ status: 401, description: 'Código inválido' })
  async verify(@GetUser() user: any, @Body() dto: Verify2FADto) {
    let isValid = false;

    // Intentar como TOTP
    if (this.twoFactorService.validateTOTPFormat(dto.token)) {
      isValid = await this.twoFactorService.verifyTOTP(user.userId, dto.token);
    }
    // Intentar como código de respaldo
    else if (this.twoFactorService.validateBackupCodeFormat(dto.token)) {
      isValid = await this.twoFactorService.verifyBackupCode(user.userId, dto.token);
    }

    if (!isValid) {
      await this.auditService.log({
        userId: user.userId,
        email: user.email,
        action: '2fa-verification',
        status: 'failure',
        errorMessage: 'Invalid 2FA code',
      });

      throw new BadRequestException('Código de verificación inválido');
    }

    await this.auditService.log({
      userId: user.userId,
      email: user.email,
      action: '2fa-verification',
      status: 'success',
    });

    return {
      success: true,
      message: 'Código verificado exitosamente',
    };
  }

  @Post('disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar 2FA' })
  @ApiResponse({ status: 200, description: '2FA desactivado exitosamente' })
  @ApiResponse({ status: 401, description: 'Código de verificación inválido' })
  async disable(@GetUser() user: any, @Body() dto: Disable2FADto) {
    await this.twoFactorService.disableTwoFactor(user.userId, dto.verificationCode);
    
    await this.auditService.log({
      userId: user.userId,
      email: user.email,
      action: '2fa-disabled',
      status: 'success',
    });

    return {
      success: true,
      message: '2FA desactivado exitosamente',
    };
  }

  @Post('backup-codes/regenerate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerar códigos de respaldo' })
  @ApiResponse({ status: 200, description: 'Códigos regenerados exitosamente' })
  async regenerateBackupCodes(@GetUser() user: any) {
    const result = await this.twoFactorService.regenerateBackupCodes(user.userId);
    
    await this.auditService.log({
      userId: user.userId,
      email: user.email,
      action: '2fa-backup-codes-regenerated',
      status: 'success',
    });

    return {
      success: true,
      data: {
        backupCodes: result.backupCodes,
      },
      message: 'Códigos de respaldo regenerados. Los códigos anteriores ya no funcionarán.',
    };
  }

  @Get('status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener estado de 2FA del usuario' })
  @ApiResponse({ status: 200, description: 'Estado obtenido exitosamente' })
  async getStatus(@GetUser() user: any) {
    const isEnabled = await this.twoFactorService.isTwoFactorEnabled(user.userId);
    const remainingBackupCodes = isEnabled 
      ? await this.twoFactorService.getRemainingBackupCodes(user.userId)
      : 0;

    return {
      success: true,
      data: {
        enabled: isEnabled,
        backupCodesRemaining: remainingBackupCodes,
      },
    };
  }
}
