import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminUpdateUserDto, SendBulkEmailDto, SendBulkSmsDto } from './dto/admin.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @Roles('admin', 'super-admin')
  @ApiOperation({ summary: 'Get dashboard statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Dashboard stats retrieved' })
  async getDashboardStats() {
    const stats = await this.adminService.getDashboardStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Get('reports/users')
  @Roles('admin', 'super-admin')
  @ApiOperation({ summary: 'Get users report (Admin only)' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Users report retrieved' })
  async getUsersReport(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const report = await this.adminService.getUsersReport(start, end);
    return {
      success: true,
      count: report.length,
      data: report,
    };
  }

  @Get('reports/events')
  @Roles('admin', 'super-admin')
  @ApiOperation({ summary: 'Get events report (Admin only)' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Events report retrieved' })
  async getEventsReport(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const report = await this.adminService.getEventsReport(start, end);
    return {
      success: true,
      count: report.length,
      data: report,
    };
  }

  @Get('reports/memberships')
  @Roles('admin', 'super-admin')
  @ApiOperation({ summary: 'Get memberships report (Admin only)' })
  @ApiResponse({ status: 200, description: 'Memberships report retrieved' })
  async getMembershipReport() {
    const report = await this.adminService.getMembershipReport();
    return {
      success: true,
      data: report,
    };
  }

  @Get('users/search')
  @Roles('admin', 'super-admin')
  @ApiOperation({ summary: 'Search users (Admin only)' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchUsers(@Query('q') searchTerm: string, @Query('limit') limit?: string) {
    const users = await this.adminService.searchUsers(searchTerm, limit ? parseInt(limit) : 50);
    return {
      success: true,
      count: users.length,
      data: users,
    };
  }

  @Get('users/:id/activity')
  @Roles('admin', 'super-admin')
  @ApiOperation({ summary: 'Get user activity (Admin only)' })
  @ApiQuery({ name: 'days', required: false })
  @ApiResponse({ status: 200, description: 'User activity retrieved' })
  async getUserActivity(@Param('id') userId: string, @Query('days') days?: string) {
    const activity = await this.adminService.getUserActivity(userId, days ? parseInt(days) : 30);
    return {
      success: true,
      data: activity,
    };
  }

  @Put('users/:id')
  @Roles('admin', 'super-admin')
  @ApiOperation({ summary: 'Update user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  async updateUser(@Param('id') userId: string, @Body() updateData: AdminUpdateUserDto) {
    const user = await this.adminService.updateUser(userId, updateData);
    return {
      success: true,
      message: 'User updated successfully',
      data: user,
    };
  }

  @Delete('users/:id')
  @Roles('super-admin')
  @ApiOperation({ summary: 'Delete user (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async deleteUser(@Param('id') userId: string) {
    const result = await this.adminService.deleteUser(userId);
    return {
      success: true,
      ...result,
    };
  }

  @Get('system/health')
  @Roles('admin', 'super-admin')
  @ApiOperation({ summary: 'Get system health (Admin only)' })
  @ApiResponse({ status: 200, description: 'System health retrieved' })
  async getSystemHealth() {
    const health = await this.adminService.getSystemHealth();
    return {
      success: true,
      data: health,
    };
  }

  // Communication endpoints
  /*
  @Post('communication/email')
  @Roles('admin', 'super-admin')
  @ApiOperation({ summary: 'Send bulk email (Admin only)' })
  @ApiResponse({ status: 200, description: 'Email queued successfully' })
  async sendBulkEmail(@Body() emailData: SendBulkEmailDto) {
    const result = await this.adminService.sendBulkEmail(emailData);
    return {
      success: true,
      ...result,
    };
  }

  @Post('communication/sms')
  @Roles('admin', 'super-admin')
  @ApiOperation({ summary: 'Send bulk SMS (Admin only)' })
  @ApiResponse({ status: 200, description: 'SMS queued successfully' })
  async sendBulkSms(@Body() smsData: SendBulkSmsDto) {
    const result = await this.adminService.sendBulkSms(smsData);
    return {
      success: true,
      ...result,
    };
  }
  */
}
