import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CronService } from './cron.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('cron')
@Controller('cron')
@UseGuards(RolesGuard)
@Roles('super-admin')
@ApiBearerAuth()
export class CronController {
  constructor(private readonly cronService: CronService) {}

  @Get('tasks')
  @ApiOperation({ summary: 'List all scheduled tasks (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved' })
  async listTasks() {
    const tasks = await this.cronService.listScheduledTasks();
    return {
      success: true,
      count: tasks.length,
      data: tasks,
    };
  }

  @Post('tasks/:taskName/trigger')
  @ApiOperation({ summary: 'Manually trigger a task (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Task triggered' })
  async triggerTask(@Param('taskName') taskName: string) {
    const result = await this.cronService.triggerTask(taskName);
    return result;
  }

  @Post('tasks/:taskName/pause')
  @ApiOperation({ summary: 'Pause a scheduled task (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Task paused' })
  async pauseTask(@Param('taskName') taskName: string) {
    const result = await this.cronService.pauseTask(taskName);
    return result;
  }

  @Post('tasks/:taskName/resume')
  @ApiOperation({ summary: 'Resume a scheduled task (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Task resumed' })
  async resumeTask(@Param('taskName') taskName: string) {
    const result = await this.cronService.resumeTask(taskName);
    return result;
  }
}
