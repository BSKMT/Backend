import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MembershipsService } from './memberships.service';
import {
  CreateMembershipDto,
  UpdateMembershipDto,
  ApplyMembershipDto,
} from './dto/membership.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('memberships')
@Controller('memberships')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all memberships' })
  @ApiQuery({ name: 'includeInactive', required: false })
  @ApiResponse({ status: 200, description: 'Memberships retrieved successfully' })
  async findAll(@Query('includeInactive') includeInactive?: string) {
    const memberships = await this.membershipsService.findAll(includeInactive === 'true');
    return {
      success: true,
      count: memberships.length,
      data: memberships,
    };
  }

  @Get('statistics')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all memberships statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getAllStatistics() {
    const statistics = await this.membershipsService.getAllMembershipStatistics();
    return {
      success: true,
      data: statistics,
    };
  }

  @Get('compare')
  @ApiOperation({ summary: 'Compare multiple memberships' })
  @ApiQuery({ name: 'slugs', required: true, description: 'Comma-separated membership slugs' })
  @ApiResponse({ status: 200, description: 'Comparison data retrieved' })
  async compare(@Query('slugs') slugs: string) {
    const slugArray = slugs.split(',');
    const comparison = await this.membershipsService.compareMemberships(slugArray);
    return {
      success: true,
      data: comparison,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get membership by ID' })
  @ApiResponse({ status: 200, description: 'Membership retrieved' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  async findOne(@Param('id') id: string) {
    const membership = await this.membershipsService.findOne(id);
    return {
      success: true,
      data: membership,
    };
  }

  @Get(':id/statistics')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get membership statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getStatistics(@Param('id') id: string) {
    const statistics = await this.membershipsService.getMembershipStatistics(id);
    return {
      success: true,
      data: statistics,
    };
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get membership by slug' })
  @ApiResponse({ status: 200, description: 'Membership retrieved' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  async findBySlug(@Param('slug') slug: string) {
    const membership = await this.membershipsService.findBySlug(slug);
    return {
      success: true,
      data: membership,
    };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'super-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create membership (Admin only)' })
  @ApiResponse({ status: 201, description: 'Membership created successfully' })
  async create(@Body() createMembershipDto: CreateMembershipDto) {
    const membership = await this.membershipsService.create(createMembershipDto);
    return {
      success: true,
      message: 'Membership created successfully',
      data: membership,
    };
  }

  @Post('apply')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply for membership' })
  @ApiResponse({ status: 200, description: 'Membership application successful' })
  async apply(@Req() req: any, @Body() applyMembershipDto: ApplyMembershipDto) {
    const result = await this.membershipsService.applyMembership(req.user.userId, applyMembershipDto);
    return result;
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update membership (Admin only)' })
  @ApiResponse({ status: 200, description: 'Membership updated successfully' })
  async update(@Param('id') id: string, @Body() updateMembershipDto: UpdateMembershipDto) {
    const membership = await this.membershipsService.update(id, updateMembershipDto);
    return {
      success: true,
      message: 'Membership updated successfully',
      data: membership,
    };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('super-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete membership (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Membership deleted successfully' })
  async remove(@Param('id') id: string) {
    const result = await this.membershipsService.remove(id);
    return {
      success: true,
      ...result,
    };
  }
}
