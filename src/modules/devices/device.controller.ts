import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Param, 
  UseGuards, 
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DeviceService } from './device.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('devices')
@Controller('devices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Get()
  @ApiOperation({ summary: 'Listar dispositivos confiables del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de dispositivos' })
  async listDevices(@GetUser() user: any) {
    const devices = await this.deviceService.listUserDevices(user.userId);

    return {
      success: true,
      count: devices.length,
      data: devices.map(device => ({
        id: device._id,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        browser: device.browser,
        os: device.os,
        location: device.location,
        city: device.city,
        country: device.country,
        lastUsedAt: device.lastUsedAt,
        expiresAt: device.expiresAt,
      })),
    };
  }

  @Post('trust')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar dispositivo actual como confiable' })
  @ApiResponse({ status: 200, description: 'Dispositivo agregado como confiable' })
  async trustCurrentDevice(
    @GetUser() user: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const deviceFingerprint = req.headers['x-device-fingerprint'] as string || 'unknown';
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // TODO: Integrar con geolocalización para obtener location
    const result = await this.deviceService.trustDevice(
      user.userId,
      { deviceFingerprint, ipAddress, userAgent },
      user.name || user.email,
      user.email
    );

    // Establecer cookie "remember device" por 30 días
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('remember_device', result.rememberToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
      path: '/',
      ...(isProduction && { domain: '.bskmt.com' }), // Permitir cookies en subdominios en producción
    });

    return {
      success: true,
      message: 'Dispositivo marcado como confiable por 30 días',
      data: {
        expiresAt: result.expiresAt,
      },
    };
  }

  @Delete(':deviceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revocar dispositivo confiable' })
  @ApiResponse({ status: 200, description: 'Dispositivo revocado exitosamente' })
  async revokeDevice(
    @GetUser() user: any,
    @Param('deviceId') deviceId: string,
  ) {
    await this.deviceService.revokeDevice(user.userId, deviceId);

    return {
      success: true,
      message: 'Dispositivo revocado exitosamente',
    };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revocar todos los dispositivos confiables' })
  @ApiResponse({ status: 200, description: 'Todos los dispositivos revocados' })
  async revokeAllDevices(
    @GetUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const count = await this.deviceService.revokeAllUserDevices(user.userId);

    // Limpiar cookie
    res.clearCookie('remember_device', { path: '/' });

    return {
      success: true,
      message: `${count} dispositivo(s) revocado(s) exitosamente`,
      data: { count },
    };
  }
}
