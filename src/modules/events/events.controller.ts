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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto, UpdateEventDto, RegisterToEventDto } from './dto/event.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all events' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'eventType', required: false })
  @ApiQuery({ name: 'difficulty', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiResponse({ status: 200, description: 'Events retrieved successfully' })
  async findAll(
    @Query('status') status?: string,
    @Query('eventType') eventType?: string,
    @Query('difficulty') difficulty?: string,
    @Query('isActive') isActive?: string,
  ) {
    const filters = {
      status,
      eventType,
      difficulty,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    };

    const events = await this.eventsService.findAll(filters);
    return {
      success: true,
      count: events.length,
      data: events,
    };
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming events' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Upcoming events retrieved' })
  async findUpcoming(@Query('limit') limit?: number) {
    const events = await this.eventsService.findUpcoming(limit);
    return {
      success: true,
      count: events.length,
      data: events,
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search events by text' })
  @ApiQuery({ name: 'q', required: true })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(@Query('q') searchTerm: string) {
    const events = await this.eventsService.searchEvents(searchTerm);
    return {
      success: true,
      count: events.length,
      data: events,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiResponse({ status: 200, description: 'Event retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async findOne(@Param('id') id: string) {
    const event = await this.eventsService.findOne(id);
    return {
      success: true,
      data: event,
    };
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get event statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getStatistics(@Param('id') id: string) {
    const statistics = await this.eventsService.getEventStatistics(id);
    return {
      success: true,
      data: statistics,
    };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'super-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new event (Admin only)' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(@Body() createEventDto: CreateEventDto, @Req() req: any) {
    const event = await this.eventsService.create(createEventDto, req.user.userId);
    return {
      success: true,
      message: 'Event created successfully',
      data: event,
    };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update event (Admin only)' })
  @ApiResponse({ status: 200, description: 'Event updated successfully' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    const event = await this.eventsService.update(id, updateEventDto);
    return {
      success: true,
      message: 'Event updated successfully',
      data: event,
    };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete event (Admin only)' })
  @ApiResponse({ status: 200, description: 'Event deleted successfully' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async remove(@Param('id') id: string) {
    await this.eventsService.remove(id);
    return {
      success: true,
      message: 'Event deleted successfully',
    };
  }

  @Post(':id/register')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register user to event' })
  @ApiResponse({ status: 200, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'User already registered' })
  async register(@Param('id') id: string, @Req() req: any) {
    const event = await this.eventsService.registerParticipant(id, req.user.userId);
    return {
      success: true,
      message: 'Successfully registered to event',
      data: event,
    };
  }

  @Delete(':id/register')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unregister user from event' })
  @ApiResponse({ status: 200, description: 'User unregistered successfully' })
  async unregister(@Param('id') id: string, @Req() req: any) {
    const event = await this.eventsService.unregisterParticipant(id, req.user.userId);
    return {
      success: true,
      message: 'Successfully unregistered from event',
      data: event,
    };
  }

  @Post(':id/attendance')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark user attendance (Admin only)' })
  @ApiResponse({ status: 200, description: 'Attendance marked' })
  async markAttendance(@Param('id') id: string, @Body() body: RegisterToEventDto) {
    const event = await this.eventsService.markAttendance(id, body.userId);
    return {
      success: true,
      message: 'Attendance marked successfully',
      data: event,
    };
  }
}
