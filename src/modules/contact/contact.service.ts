import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ContactMessage } from '../../common/schemas/contact-message.schema';
import { PQRSDF } from '../../common/schemas/pqrsdf.schema';
import {
  CreateContactMessageDto,
  RespondContactMessageDto,
  CreatePQRSDFDto,
  AddPQRSDFMessageDto,
  UpdatePQRSDFStatusDto,
} from './dto/contact.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class ContactService {
  constructor(
    @InjectModel(ContactMessage.name) private contactMessageModel: Model<ContactMessage>,
    @InjectModel(PQRSDF.name) private pqrsdfModel: Model<PQRSDF>,
    private emailService: EmailService,
  ) {}

  // Contact Messages
  async createContactMessage(createDto: CreateContactMessageDto, ipAddress?: string, userAgent?: string) {
    const contactMessage = new this.contactMessageModel({
      ...createDto,
      category: createDto.category || 'general',
      ipAddress,
      userAgent,
    });

    return contactMessage.save();
  }

  async getAllContactMessages(status?: string, category?: string) {
    const query: any = {};
    if (status) query.status = status;
    if (category) query.category = category;

    return this.contactMessageModel
      .find(query)
      .sort({ createdAt: -1 })
      .lean();
  }

  async getContactMessage(id: string) {
    const message = await this.contactMessageModel.findById(id);
    if (!message) {
      throw new NotFoundException('Contact message not found');
    }

    // Increment view count
    message.viewCount += 1;
    message.lastViewedAt = new Date();
    await message.save();

    return message;
  }

  async respondToContactMessage(id: string, respondDto: RespondContactMessageDto, respondedById: string, respondedByName: string) {
    const message = await this.contactMessageModel.findById(id);
    if (!message) {
      throw new NotFoundException('Contact message not found');
    }

    message.response = respondDto.response;
    message.responseDate = new Date();
    message.respondedBy = respondedById as any;
    message.respondedByName = respondedByName;
    message.status = respondDto.newStatus || 'resolved';

    // Add to conversation
    if (!message.conversation) message.conversation = [];
    message.conversation.push({
      date: new Date(),
      from: 'staff',
      message: respondDto.response,
      author: respondedByName,
      isPublic: true,
    });

    await message.save();

    // TODO: Send email notification to user
    
    return message;
  }

  async updateContactMessageStatus(id: string, status: string, assignedTo?: string, assignedToName?: string) {
    const message = await this.contactMessageModel.findByIdAndUpdate(
      id,
      {
        status,
        ...(assignedTo && { assignedTo, assignedToName }),
      },
      { new: true },
    );

    if (!message) {
      throw new NotFoundException('Contact message not found');
    }

    return message;
  }

  async deleteContactMessage(id: string) {
    const message = await this.contactMessageModel.findByIdAndDelete(id);
    if (!message) {
      throw new NotFoundException('Contact message not found');
    }

    return { message: 'Contact message deleted successfully' };
  }

  // PQRSDF
  async createPQRSDF(userId: string, createDto: CreatePQRSDFDto) {
    const pqrsdf = new this.pqrsdfModel({
      ...createDto,
      usuarioId: userId,
      timeline: [
        {
          id: Date.now().toString(),
          tipo: 'creada',
          descripcion: `Solicitud creada - ${createDto.categoria}`,
          fecha: new Date(),
        },
      ],
      mensajes: [
        {
          id: Date.now().toString(),
          contenido: createDto.descripcion,
          tipo: 'usuario',
          autorId: userId,
          autorNombre: 'Usuario',
          fechaCreacion: new Date(),
        },
      ],
    });

    return pqrsdf.save();
  }

  async getAllPQRSDF(userId?: string, estado?: string, categoria?: string) {
    const query: any = {};
    if (userId) query.usuarioId = userId;
    if (estado) query.estado = estado;
    if (categoria) query.categoria = categoria;

    return this.pqrsdfModel
      .find(query)
      .sort({ fechaCreacion: -1 })
      .lean();
  }

  async getPQRSDF(id: string) {
    const pqrsdf = await this.pqrsdfModel.findById(id);
    if (!pqrsdf) {
      throw new NotFoundException('PQRSDF not found');
    }

    return pqrsdf;
  }

  async getPQRSDFByNumber(numeroSolicitud: string) {
    const pqrsdf = await this.pqrsdfModel.findOne({ numeroSolicitud });
    if (!pqrsdf) {
      throw new NotFoundException('PQRSDF not found');
    }

    return pqrsdf;
  }

  async addPQRSDFMessage(id: string, addMessageDto: AddPQRSDFMessageDto, userId: string, userName: string, tipo: 'usuario' | 'admin' = 'usuario') {
    const pqrsdf = await this.pqrsdfModel.findById(id);
    if (!pqrsdf) {
      throw new NotFoundException('PQRSDF not found');
    }

    const newMessage = {
      id: Date.now().toString(),
      contenido: addMessageDto.contenido,
      tipo,
      autorId: userId,
      autorNombre: userName,
      fechaCreacion: new Date(),
    };

    pqrsdf.mensajes.push(newMessage as any);
    pqrsdf.timeline.push({
      id: Date.now().toString(),
      tipo: 'mensaje',
      descripcion: `Nuevo mensaje de ${tipo === 'usuario' ? 'usuario' : 'administrador'}`,
      fecha: new Date(),
      autorId: userId,
      autorNombre: userName,
    } as any);

    pqrsdf.fechaActualizacion = new Date();
    await pqrsdf.save();

    return pqrsdf;
  }

  async updatePQRSDFStatus(id: string, updateDto: UpdatePQRSDFStatusDto, adminId: string, adminName: string) {
    const pqrsdf = await this.pqrsdfModel.findById(id);
    if (!pqrsdf) {
      throw new NotFoundException('PQRSDF not found');
    }

    const oldStatus = pqrsdf.estado;
    pqrsdf.estado = updateDto.estado;
    pqrsdf.fechaActualizacion = new Date();

    if (updateDto.respuestaFinal) {
      pqrsdf.respuestaFinal = updateDto.respuestaFinal;
      pqrsdf.fechaRespuesta = new Date();

      // Calculate response time in days
      const diffTime = Math.abs(pqrsdf.fechaRespuesta.getTime() - pqrsdf.fechaCreacion.getTime());
      pqrsdf.tiempoRespuestaDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    if (updateDto.estado === 'cerrada') {
      pqrsdf.fechaCierre = new Date();
    }

    pqrsdf.asignadoA = adminId;
    pqrsdf.asignadoANombre = adminName;

    pqrsdf.timeline.push({
      id: Date.now().toString(),
      tipo: updateDto.estado === 'cerrada' ? 'cerrada' : 'actualizada',
      descripcion: `Estado cambiado de ${oldStatus} a ${updateDto.estado}`,
      fecha: new Date(),
      autorId: adminId,
      autorNombre: adminName,
    } as any);

    await pqrsdf.save();

    // TODO: Send email/SMS notification to user

    return pqrsdf;
  }

  async getMyPQRSDF(userId: string) {
    return this.pqrsdfModel
      .find({ usuarioId: userId })
      .sort({ fechaCreacion: -1 })
      .lean();
  }

  async getPQRSDFStatistics() {
    const [total, enRevision, respondidas, cerradas, escaladas] = await Promise.all([
      this.pqrsdfModel.countDocuments(),
      this.pqrsdfModel.countDocuments({ estado: 'en_revision' }),
      this.pqrsdfModel.countDocuments({ estado: 'respondida' }),
      this.pqrsdfModel.countDocuments({ estado: 'cerrada' }),
      this.pqrsdfModel.countDocuments({ estado: 'escalada' }),
    ]);

    const porCategoria = await this.pqrsdfModel.aggregate([
      {
        $group: {
          _id: '$categoria',
          count: { $sum: 1 },
        },
      },
    ]);

    const avgResponseTime = await this.pqrsdfModel.aggregate([
      { $match: { tiempoRespuestaDias: { $exists: true, $gt: 0 } } },
      {
        $group: {
          _id: null,
          avg: { $avg: '$tiempoRespuestaDias' },
        },
      },
    ]);

    return {
      total,
      estados: {
        enRevision,
        respondidas,
        cerradas,
        escaladas,
      },
      porCategoria,
      tiempoPromedioRespuesta: avgResponseTime[0]?.avg || 0,
    };
  }

  // Email sending
  async sendEmail(sendEmailDto: any) {
    try {
      const { type, recipientEmail, recipientName, templateData } = sendEmailDto;

      switch (type) {
        case 'verification':
          await this.emailService.sendVerificationEmail({
            email: recipientEmail,
            firstName: templateData?.firstName || recipientName.split(' ')[0],
            lastName: templateData?.lastName || recipientName.split(' ').slice(1).join(' '),
            verificationUrl: templateData?.verificationUrl,
          });
          break;

        case 'welcome':
          await this.emailService.sendWelcomeEmail({
            email: recipientEmail,
            firstName: templateData?.userData?.firstName || recipientName.split(' ')[0],
            lastName: templateData?.userData?.lastName || recipientName.split(' ').slice(1).join(' '),
            membershipType: templateData?.userData?.membershipType,
          });
          break;

        case 'password-reset':
          await this.emailService.sendPasswordResetEmail({
            email: recipientEmail,
            firstName: templateData?.firstName || recipientName.split(' ')[0],
            resetUrl: templateData?.resetUrl,
          });
          break;

        default:
          throw new BadRequestException(`Email type '${type}' not supported`);
      }

      return {
        success: true,
        message: 'Email sent successfully',
        emailId: `email_${Date.now()}`,
      };
    } catch (error) {
      console.error('Error sending email:', error);
      throw new BadRequestException('Failed to send email');
    }
  }
}
