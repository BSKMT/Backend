import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  UpdateUserDto,
  UpdateUserRoleDto,
  ToggleUserStatusDto,
  ChangePasswordDto,
  UpdateUserMembershipDto,
} from './dto/user.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin', 'super-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiQuery({ name: 'membershipType', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'role', required: false })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAll(
    @Query('membershipType') membershipType?: string,
    @Query('isActive') isActive?: string,
    @Query('city') city?: string,
    @Query('role') role?: string,
  ) {
    const filters = {
      membershipType,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      city,
      role,
    };

    const users = await this.usersService.findAll(filters);
    return {
      success: true,
      count: users.length,
      data: users,
    };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getProfile(@Req() req: any) {
    const user = await this.usersService.findOne(req.user.userId);
    return {
      success: true,
      data: user,
    };
  }

  @Get('search')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search users' })
  @ApiQuery({ name: 'q', required: true })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(@Query('q') searchTerm: string) {
    const users = await this.usersService.searchUsers(searchTerm);
    return {
      success: true,
      count: users.length,
      data: users,
    };
  }

  @Get('by-city/:city')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get users by city' })
  @ApiResponse({ status: 200, description: 'Users retrieved' })
  async getUsersByCity(@Param('city') city: string) {
    const users = await this.usersService.getUsersByCity(city);
    return {
      success: true,
      count: users.length,
      data: users,
    };
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    return {
      success: true,
      data: user,
    };
  }

  @Get(':id/stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getUserStats(@Param('id') id: string) {
    const stats = await this.usersService.getUserStats(id);
    return {
      success: true,
      data: stats,
    };
  }

  @Put('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(@Req() req: any, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(req.user.userId, updateUserDto);
    return {
      success: true,
      message: 'Profile updated successfully',
      data: user,
    };
  }

  @Put('me/password')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password' })
  async changePassword(@Req() req: any, @Body() changePasswordDto: ChangePasswordDto) {
    await this.usersService.changePassword(req.user.userId, changePasswordDto);
    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(id, updateUserDto);
    return {
      success: true,
      message: 'User updated successfully',
      data: user,
    };
  }

  @Put(':id/role')
  @UseGuards(RolesGuard)
  @Roles('super-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user role (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  async updateRole(@Param('id') id: string, @Body() updateRoleDto: UpdateUserRoleDto) {
    const user = await this.usersService.updateRole(id, updateRoleDto.role);
    return {
      success: true,
      message: 'User role updated successfully',
      data: user,
    };
  }

  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle user status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  async toggleStatus(@Param('id') id: string, @Body() toggleStatusDto: ToggleUserStatusDto) {
    const user = await this.usersService.toggleStatus(id, toggleStatusDto.isActive);
    return {
      success: true,
      message: 'User status updated successfully',
      data: user,
    };
  }

  @Put(':id/membership')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user membership type (Admin only)' })
  @ApiResponse({ status: 200, description: 'Membership updated successfully' })
  async updateMembership(
    @Param('id') id: string,
    @Body() updateMembershipDto: UpdateUserMembershipDto,
  ) {
    const user = await this.usersService.updateMembership(id, updateMembershipDto.membershipType);
    return {
      success: true,
      message: 'User membership updated successfully',
      data: user,
    };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('super-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return {
      success: true,
      message: 'User deleted successfully',
    };
  }
}
