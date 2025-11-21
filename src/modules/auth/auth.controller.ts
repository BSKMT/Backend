import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import {
  LoginDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/login.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { Public } from './decorators/public.decorator';
import { GetUser } from './decorators/get-user.decorator';

@ApiTags('auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente' })
  @ApiResponse({ status: 409, description: 'Email ya registrado' })
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const user = await this.authService.register(registerDto, ipAddress, userAgent);

    this.logger.log(`User registered: ${user.email}`);

    return {
      success: true,
      message: 'Usuario registrado exitosamente. Por favor verifica tu email.',
      user: {
        id: user._id.toString(),
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
      },
    };
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({ status: 200, description: 'Login exitoso' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const deviceFingerprint = req.headers['x-device-fingerprint'] as string;

    const { accessToken, refreshToken, user } = await this.authService.login(
      req.user,
      ipAddress,
      userAgent,
      deviceFingerprint,
      loginDto.rememberMe,
    );

    // Configurar cookies httpOnly
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
    };

    // Access token - 15 minutos
    res.cookie('access_token', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    // Refresh token - 7 días o 30 días si "remember me"
    const refreshMaxAge = loginDto.rememberMe ? 30 : 7;
    res.cookie('refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: refreshMaxAge * 24 * 60 * 60 * 1000,
    });

    this.logger.log(`User logged in: ${user.email}`);

    return {
      success: true,
      message: 'Login exitoso',
      user,
      accessToken, // También enviar en body para compatibilidad
      refreshToken,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión' })
  @ApiResponse({ status: 200, description: 'Logout exitoso' })
  async logout(
    @GetUser('userId') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const accessToken = req.cookies?.['access_token'];

    if (accessToken) {
      await this.authService.logout(userId, accessToken);
    }

    // Limpiar cookies
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });

    this.logger.log(`User logged out: ${userId}`);

    return {
      success: true,
      message: 'Logout exitoso',
    };
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refrescar access token' })
  @ApiResponse({ status: 200, description: 'Token refrescado exitosamente' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido' })
  async refresh(
    @GetUser('userId') userId: string,
    @GetUser('refreshToken') oldRefreshToken: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const { accessToken, refreshToken } = await this.authService.refreshTokens(
      userId,
      oldRefreshToken,
      ipAddress,
      userAgent,
    );

    // Configurar nuevas cookies
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
    };

    res.cookie('access_token', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    this.logger.log(`Tokens refreshed for user: ${userId}`);

    return {
      success: true,
      message: 'Token refrescado exitosamente',
      accessToken,
      refreshToken,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener usuario actual' })
  @ApiResponse({ status: 200, description: 'Usuario obtenido exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getMe(@GetUser() user: any) {
    return {
      success: true,
      user: {
        id: user.user._id.toString(),
        email: user.user.email,
        nombre: user.user.nombre,
        apellido: user.user.apellido,
        role: user.user.role,
        emailVerified: user.user.emailVerified,
        profileImage: user.user.profileImage,
        membershipStatus: user.user.membershipStatus,
        isActive: user.user.isActive,
      },
    };
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar email' })
  @ApiResponse({ status: 200, description: 'Email verificado exitosamente' })
  @ApiResponse({ status: 400, description: 'Token inválido o expirado' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    await this.authService.verifyEmail(verifyEmailDto.token);

    this.logger.log(`Email verified with token: ${verifyEmailDto.token}`);

    return {
      success: true,
      message: 'Email verificado exitosamente',
    };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar reset de contraseña' })
  @ApiResponse({ status: 200, description: 'Email de reset enviado' })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    await this.authService.requestPasswordReset(
      forgotPasswordDto.email,
      ipAddress,
      userAgent,
    );

    this.logger.log(`Password reset requested for: ${forgotPasswordDto.email}`);

    // Siempre retornar éxito para no revelar si el email existe
    return {
      success: true,
      message:
        'Si el email existe, recibirás instrucciones para resetear tu contraseña',
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resetear contraseña' })
  @ApiResponse({ status: 200, description: 'Contraseña reseteada exitosamente' })
  @ApiResponse({ status: 400, description: 'Token inválido o expirado' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );

    this.logger.log(`Password reset completed`);

    return {
      success: true,
      message: 'Contraseña reseteada exitosamente',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener sesiones activas' })
  @ApiResponse({ status: 200, description: 'Sesiones obtenidas exitosamente' })
  async getSessions(@GetUser('userId') userId: string) {
    const sessions = await this.authService.getUserActiveSessions(userId);

    return {
      success: true,
      sessions: sessions.map((session) => ({
        id: session._id.toString(),
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        deviceName: session.deviceName,
        location: session.location,
        lastActivityAt: session.lastActivityAt,
        createdAt: session.createdAt,
      })),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/:sessionId/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revocar sesión específica' })
  @ApiResponse({ status: 200, description: 'Sesión revocada exitosamente' })
  async revokeSession(
    @GetUser('userId') userId: string,
    @Req() req: Request,
  ) {
    const sessionId = req.params.sessionId;
    await this.authService.revokeSession(sessionId, userId);

    this.logger.log(`Session revoked: ${sessionId} for user: ${userId}`);

    return {
      success: true,
      message: 'Sesión revocada exitosamente',
    };
  }
}
