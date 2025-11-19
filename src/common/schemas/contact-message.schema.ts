import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ContactMessageDocument = ContactMessage & Document;

class Conversation {
  @Prop({ required: true })
  date: Date;

  @Prop({ required: true, enum: ['user', 'staff'] })
  from: string;

  @Prop({ required: true })
  message: string;

  @Prop()
  author?: string;

  @Prop({ default: true })
  isPublic: boolean;
}

class Attachment {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true })
  url: string;

  @Prop({ default: Date.now })
  uploadDate: Date;
}

@Schema({
  timestamps: true,
  collection: 'contact_messages',
})
export class ContactMessage {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  email: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ required: true, trim: true })
  subject: string;

  @Prop({ required: true })
  message: string;

  @Prop({
    required: true,
    enum: ['general', 'membership', 'events', 'complaints', 'suggestions', 'technical', 'emergency'],
    default: 'general',
  })
  category: string;

  @Prop({
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'low',
  })
  priority: string;

  @Prop({
    enum: ['new', 'read', 'in-progress', 'resolved', 'closed'],
    default: 'new',
  })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo?: Types.ObjectId;

  @Prop()
  assignedToName?: string;

  @Prop()
  response?: string;

  @Prop()
  responseDate?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  respondedBy?: Types.ObjectId;

  @Prop()
  respondedByName?: string;

  @Prop({ default: false })
  followUpRequired: boolean;

  @Prop()
  followUpDate?: Date;

  @Prop()
  followUpNotes?: string;

  @Prop({ type: [Conversation], default: [] })
  conversation?: Conversation[];

  @Prop({ type: [Attachment], default: [] })
  attachments?: Attachment[];

  @Prop({
    enum: ['website', 'email', 'phone', 'whatsapp', 'social-media', 'in-person'],
    default: 'website',
  })
  source: string;

  @Prop({ default: false })
  isSpam: boolean;

  @Prop({ default: 0 })
  spamScore: number;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop({ default: 0 })
  viewCount: number;

  @Prop()
  lastViewedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  lastViewedBy?: Types.ObjectId;

  @Prop({ type: Map })
  metadata?: Map<string, any>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ContactMessageSchema = SchemaFactory.createForClass(ContactMessage);

// Índices
ContactMessageSchema.index({ status: 1 });
ContactMessageSchema.index({ category: 1 });
ContactMessageSchema.index({ priority: 1 });
ContactMessageSchema.index({ createdAt: -1 });
ContactMessageSchema.index({ assignedTo: 1 });
ContactMessageSchema.index({ email: 1 });
ContactMessageSchema.index({ isSpam: 1 });
