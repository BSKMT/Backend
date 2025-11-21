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
  Ip,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import {
  CreateContactMessageDto,
  RespondContactMessageDto,
  CreatePQRSDFDto,
  AddPQRSDFMessageDto,
  UpdatePQRSDFStatusDto,
  SendEmailDto,
} from './dto/contact.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  // Email sending endpoint
  @Post('send')
  @ApiOperation({ summary: 'Send email' })
  @ApiResponse({ status: 200, description: 'Email sent successfully' })
  async sendEmail(@Body() sendEmailDto: SendEmailDto) {
    const result = await this.contactService.sendEmail(sendEmailDto);
    return {
      success: true,
      message: result.message,
      data: result,
    };
  }

  // Contact Messages
  @Post('messages')
  @ApiOperation({ summary: 'Create contact message' })
  @ApiResponse({ status: 201, description: 'Contact message created' })
  async createContactMessage(
    @Body() createDto: CreateContactMessageDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const message = await this.contactService.createContactMessage(createDto, ipAddress, userAgent);
    return {
      success: true,
      message: 'Contact message received successfully',
      data: message,
    };
  }

  @Get('messages')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all contact messages (Admin only)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiResponse({ status: 200, description: 'Messages retrieved' })
  async getAllContactMessages(
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    const messages = await this.contactService.getAllContactMessages(status, category);
    return {
      success: true,
      count: messages.length,
      data: messages,
    };
  }

  @Get('messages/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get contact message by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Message retrieved' })
  async getContactMessage(@Param('id') id: string) {
    const message = await this.contactService.getContactMessage(id);
    return {
      success: true,
      data: message,
    };
  }

  @Put('messages/:id/respond')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Respond to contact message (Admin only)' })
  @ApiResponse({ status: 200, description: 'Response sent' })
  async respondToContactMessage(
    @Param('id') id: string,
    @Body() respondDto: RespondContactMessageDto,
    @Req() req: any,
  ) {
    const message = await this.contactService.respondToContactMessage(
      id,
      respondDto,
      req.user.userId,
      req.user.name || 'Admin',
    );
    return {
      success: true,
      message: 'Response sent successfully',
      data: message,
    };
  }

  @Put('messages/:id/status')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update contact message status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; assignedTo?: string; assignedToName?: string },
  ) {
    const message = await this.contactService.updateContactMessageStatus(
      id,
      body.status,
      body.assignedTo,
      body.assignedToName,
    );
    return {
      success: true,
      message: 'Status updated successfully',
      data: message,
    };
  }

  @Delete('messages/:id')
  @UseGuards(RolesGuard)
  @Roles('super-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete contact message (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Message deleted' })
  async deleteContactMessage(@Param('id') id: string) {
    const result = await this.contactService.deleteContactMessage(id);
    return {
      success: true,
      ...result,
    };
  }

  // PQRSDF
  @Post('pqrsdf')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create PQRSDF' })
  @ApiResponse({ status: 201, description: 'PQRSDF created' })
  async createPQRSDF(@Req() req: any, @Body() createDto: CreatePQRSDFDto) {
    const pqrsdf = await this.contactService.createPQRSDF(req.user.userId, createDto);
    return {
      success: true,
      message: 'PQRSDF created successfully',
      data: pqrsdf,
    };
  }

  @Get('pqrsdf')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all PQRSDF (Admin only)' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'estado', required: false })
  @ApiQuery({ name: 'categoria', required: false })
  @ApiResponse({ status: 200, description: 'PQRSDF retrieved' })
  async getAllPQRSDF(
    @Query('userId') userId?: string,
    @Query('estado') estado?: string,
    @Query('categoria') categoria?: string,
  ) {
    const pqrsdf = await this.contactService.getAllPQRSDF(userId, estado, categoria);
    return {
      success: true,
      count: pqrsdf.length,
      data: pqrsdf,
    };
  }

  @Get('pqrsdf/me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my PQRSDF' })
  @ApiResponse({ status: 200, description: 'PQRSDF retrieved' })
  async getMyPQRSDF(@Req() req: any) {
    const pqrsdf = await this.contactService.getMyPQRSDF(req.user.userId);
    return {
      success: true,
      count: pqrsdf.length,
      data: pqrsdf,
    };
  }

  @Get('pqrsdf/statistics')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get PQRSDF statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getPQRSDFStatistics() {
    const statistics = await this.contactService.getPQRSDFStatistics();
    return {
      success: true,
      data: statistics,
    };
  }

  @Get('pqrsdf/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get PQRSDF by ID' })
  @ApiResponse({ status: 200, description: 'PQRSDF retrieved' })
  async getPQRSDF(@Param('id') id: string) {
    const pqrsdf = await this.contactService.getPQRSDF(id);
    return {
      success: true,
      data: pqrsdf,
    };
  }

  @Get('pqrsdf/number/:numero')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get PQRSDF by number' })
  @ApiResponse({ status: 200, description: 'PQRSDF retrieved' })
  async getPQRSDFByNumber(@Param('numero') numero: string) {
    const pqrsdf = await this.contactService.getPQRSDFByNumber(numero);
    return {
      success: true,
      data: pqrsdf,
    };
  }

  @Post('pqrsdf/:id/messages')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add message to PQRSDF' })
  @ApiResponse({ status: 200, description: 'Message added' })
  async addPQRSDFMessage(
    @Param('id') id: string,
    @Body() addMessageDto: AddPQRSDFMessageDto,
    @Req() req: any,
  ) {
    const pqrsdf = await this.contactService.addPQRSDFMessage(
      id,
      addMessageDto,
      req.user.userId,
      req.user.name || 'Usuario',
    );
    return {
      success: true,
      message: 'Message added successfully',
      data: pqrsdf,
    };
  }

  @Put('pqrsdf/:id/status')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update PQRSDF status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updatePQRSDFStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdatePQRSDFStatusDto,
    @Req() req: any,
  ) {
    const pqrsdf = await this.contactService.updatePQRSDFStatus(
      id,
      updateDto,
      req.user.userId,
      req.user.name || 'Admin',
    );
    return {
      success: true,
      message: 'Status updated successfully',
      data: pqrsdf,
    };
  }
}
