import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { SecurityService } from './security.service';

@ApiTags('security')
@Controller('security')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Get('events')
  @ApiOperation({ summary: 'Obtener eventos de seguridad del usuario' })
  @ApiResponse({ status: 200, description: 'Eventos obtenidos exitosamente' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUserEvents(
    @GetUser() user: any,
    @Query('limit') limit?: number,
  ) {
    const events = await this.securityService.getUserSecurityEvents(user.userId, limit || 50);
    
    return {
      success: true,
      count: events.length,
      data: events,
    };
  }

  @Get('stats')
  @Roles('admin', 'superadmin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Obtener estadísticas de seguridad (Admin)' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas exitosamente' })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  async getStats(@Query('hours') hours?: number) {
    const stats = await this.securityService.getSecurityStats(hours || 24);
    
    return {
      success: true,
      data: stats,
    };
  }
}
