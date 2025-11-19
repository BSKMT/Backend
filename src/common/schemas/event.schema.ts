import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EventDocument = Event & Document;

class Location {
  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  country: string;

  @Prop({ type: { lat: Number, lng: Number } })
  coordinates?: {
    lat: number;
    lng: number;
  };
}

class Organizer {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  email: string;
}

@Schema({
  timestamps: true,
  collection: 'events',
})
export class Event {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop()
  endDate?: Date;

  @Prop({ required: true, maxlength: 1000 })
  description: string;

  @Prop({ maxlength: 5000 })
  longDescription?: string;

  @Prop({ required: true })
  mainImage: string;

  @Prop({ type: [String] })
  gallery?: string[];

  @Prop()
  detailsPdf?: string;

  @Prop({ required: true, trim: true })
  eventType: string;

  @Prop({
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'published',
  })
  status: string;

  @Prop({ type: Location, required: true })
  departureLocation: Location;

  @Prop({ type: Location })
  arrivalLocation?: Location;

  @Prop({ min: 1 })
  maxParticipants?: number;

  @Prop({ default: 0, min: 0 })
  currentParticipants: number;

  @Prop()
  registrationOpenDate?: Date;

  @Prop()
  registrationDeadline?: Date;

  @Prop({ min: 0, default: 0 })
  price?: number;

  @Prop({ min: 0 })
  nonMemberPrice?: number;

  @Prop({ type: [String] })
  includedServices?: string[];

  @Prop({ type: [String] })
  requirements?: string[];

  @Prop({ enum: ['beginner', 'intermediate', 'advanced', 'expert'] })
  difficulty?: string;

  @Prop({ min: 0 })
  distance?: number;

  @Prop({ min: 0 })
  duration?: number;

  @Prop({ min: 0, default: 0 })
  pointsAwarded?: number;

  @Prop({ type: Organizer, required: true })
  organizer: Organizer;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  participants?: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  attendedParticipants?: Types.ObjectId[];

  @Prop({ type: [String] })
  tags?: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const EventSchema = SchemaFactory.createForClass(Event);

// Índices
EventSchema.index({ name: 'text', description: 'text', eventType: 'text' });
EventSchema.index({ startDate: 1 });
EventSchema.index({ eventType: 1 });
EventSchema.index({ status: 1 });
EventSchema.index({ 'departureLocation.city': 1 });
EventSchema.index({ difficulty: 1 });
EventSchema.index({ isActive: 1 });

// Validaciones pre-save
EventSchema.pre('save', function (next) {
  if (this.isNew && this.startDate <= new Date()) {
    return next(new Error('La fecha de inicio debe ser futura'));
  }

  if (this.endDate && this.endDate <= this.startDate) {
    return next(new Error('La fecha de fin debe ser posterior a la fecha de inicio'));
  }

  if (this.registrationDeadline && this.registrationDeadline >= this.startDate) {
    return next(
      new Error('La fecha límite de registro debe ser anterior al evento'),
    );
  }

  if (this.maxParticipants && this.currentParticipants > this.maxParticipants) {
    return next(new Error('Se excedió el máximo de participantes'));
  }

  next();
});
