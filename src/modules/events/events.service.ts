import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from '../../common/schemas/event.schema';
import { CreateEventDto, UpdateEventDto, RegisterToEventDto } from './dto/event.dto';

@Injectable()
export class EventsService {
  constructor(@InjectModel(Event.name) private eventModel: Model<EventDocument>) {}

  async create(createEventDto: CreateEventDto, createdBy?: string): Promise<EventDocument> {
    const event = new this.eventModel({
      ...createEventDto,
      createdBy,
      currentParticipants: 0,
      participants: [],
      attendedParticipants: [],
    });
    return event.save();
  }

  async findAll(filters?: {
    status?: string;
    eventType?: string;
    difficulty?: string;
    isActive?: boolean;
    startDate?: Date;
  }): Promise<EventDocument[]> {
    const query: any = {};

    if (filters?.status) query.status = filters.status;
    if (filters?.eventType) query.eventType = filters.eventType;
    if (filters?.difficulty) query.difficulty = filters.difficulty;
    if (filters?.isActive !== undefined) query.isActive = filters.isActive;
    if (filters?.startDate) {
      query.startDate = { $gte: filters.startDate };
    }

    return this.eventModel
      .find(query)
      .populate('createdBy', 'firstName lastName email')
      .populate('participants', 'firstName lastName email membershipType')
      .sort({ startDate: 1 })
      .exec();
  }

  async findUpcoming(limit = 10): Promise<EventDocument[]> {
    const now = new Date();
    return this.eventModel
      .find({
        startDate: { $gte: now },
        status: 'published',
        isActive: true,
      })
      .limit(limit)
      .sort({ startDate: 1 })
      .populate('createdBy', 'firstName lastName')
      .exec();
  }

  async findOne(id: string): Promise<EventDocument> {
    const event = await this.eventModel
      .findById(id)
      .populate('createdBy', 'firstName lastName email')
      .populate('participants', 'firstName lastName email membershipType profileImage')
      .populate('attendedParticipants', 'firstName lastName email')
      .exec();

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  async findBySlug(slug: string): Promise<EventDocument> {
    const event = await this.eventModel
      .findOne({ slug })
      .populate('createdBy', 'firstName lastName email')
      .populate('participants', 'firstName lastName email membershipType')
      .exec();

    if (!event) {
      throw new NotFoundException(`Event with slug ${slug} not found`);
    }

    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<EventDocument> {
    const event = await this.eventModel
      .findByIdAndUpdate(id, updateEventDto, { new: true, runValidators: true })
      .exec();

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  async remove(id: string): Promise<void> {
    const result = await this.eventModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
  }

  async registerParticipant(eventId: string, userId: string): Promise<EventDocument> {
    const event = await this.eventModel.findById(eventId).exec();

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    if (event.status !== 'published') {
      throw new BadRequestException('Event is not open for registration');
    }

    if (event.registrationDeadline && new Date() > event.registrationDeadline) {
      throw new BadRequestException('Registration deadline has passed');
    }

    if (event.participants?.includes(userId as any)) {
      throw new ConflictException('User is already registered for this event');
    }

    if (event.maxParticipants && event.currentParticipants >= event.maxParticipants) {
      throw new BadRequestException('Event has reached maximum capacity');
    }

    event.participants = event.participants || [];
    event.participants.push(userId as any);
    event.currentParticipants += 1;

    return event.save();
  }

  async unregisterParticipant(eventId: string, userId: string): Promise<EventDocument> {
    const event = await this.eventModel.findById(eventId).exec();

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    if (!event.participants?.includes(userId as any)) {
      throw new BadRequestException('User is not registered for this event');
    }

    event.participants = event.participants.filter((p) => p.toString() !== userId);
    event.currentParticipants = Math.max(0, event.currentParticipants - 1);

    return event.save();
  }

  async markAttendance(eventId: string, userId: string): Promise<EventDocument> {
    const event = await this.eventModel.findById(eventId).exec();

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    if (!event.participants?.includes(userId as any)) {
      throw new BadRequestException('User is not registered for this event');
    }

    if (event.attendedParticipants?.includes(userId as any)) {
      throw new ConflictException('User attendance already marked');
    }

    event.attendedParticipants = event.attendedParticipants || [];
    event.attendedParticipants.push(userId as any);

    return event.save();
  }

  async getEventStatistics(eventId: string) {
    const event = await this.eventModel.findById(eventId).exec();

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    return {
      totalRegistered: event.currentParticipants,
      totalAttended: event.attendedParticipants?.length || 0,
      attendanceRate:
        event.currentParticipants > 0
          ? ((event.attendedParticipants?.length || 0) / event.currentParticipants) * 100
          : 0,
      spotsAvailable: event.maxParticipants
        ? event.maxParticipants - event.currentParticipants
        : null,
      isFull: event.maxParticipants
        ? event.currentParticipants >= event.maxParticipants
        : false,
    };
  }

  async searchEvents(searchTerm: string): Promise<EventDocument[]> {
    return this.eventModel
      .find({
        $text: { $search: searchTerm },
        isActive: true,
        status: 'published',
      })
      .sort({ startDate: 1 })
      .exec();
  }
}
