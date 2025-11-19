import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'General health check' })
  @ApiResponse({ status: 200, description: 'Health status' })
  async getHealth() {
    return this.healthService.checkHealth();
  }

  @Get('database')
  @ApiOperation({ summary: 'Database health check' })
  @ApiResponse({ status: 200, description: 'Database status' })
  async getDatabaseHealth() {
    return this.healthService.checkDatabase();
  }

  @Get('env-check')
  @ApiOperation({ summary: 'Environment variables check' })
  @ApiResponse({ status: 200, description: 'Environment configuration status' })
  async getEnvironmentCheck() {
    return this.healthService.checkEnvironment();
  }
}
