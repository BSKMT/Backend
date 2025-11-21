import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditService } from './audit.service';

@ApiTags('audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('user/:userId')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Obtener logs de auditoría de un usuario' })
  @ApiResponse({ status: 200, description: 'Logs obtenidos exitosamente' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUserLogs(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    const logs = await this.auditService.getUserLogs(userId, limit || 50);
    return {
      success: true,
      count: logs.length,
      data: logs,
    };
  }

  @Get('action/:action')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Obtener logs de auditoría por acción' })
  @ApiResponse({ status: 200, description: 'Logs obtenidos exitosamente' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getLogsByAction(
    @Param('action') action: string,
    @Query('limit') limit?: number,
  ) {
    const logs = await this.auditService.getLogsByAction(action, limit || 100);
    return {
      success: true,
      count: logs.length,
      data: logs,
    };
  }

  @Get('failed-logins')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Obtener intentos de login fallidos recientes' })
  @ApiResponse({ status: 200, description: 'Logs obtenidos exitosamente' })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  async getFailedLogins(@Query('hours') hours?: number) {
    const logs = await this.auditService.getRecentFailedLogins(hours || 24);
    return {
      success: true,
      count: logs.length,
      data: logs,
    };
  }

  @Get('stats')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Obtener estadísticas de seguridad' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas exitosamente' })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  async getSecurityStats(@Query('hours') hours?: number) {
    const stats = await this.auditService.getSecurityStats(hours || 24);
    return {
      success: true,
      data: stats,
    };
  }
}
