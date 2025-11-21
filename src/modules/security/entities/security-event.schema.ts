import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SecurityEventDocument = SecurityEvent & Document;

@Schema({ timestamps: true, collection: 'security_events' })
export class SecurityEvent {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  eventType: 'suspicious_login' | 'new_location' | 'new_ip' | 'new_device' | 'failed_2fa' | 'account_locked' | 'password_changed';

  @Prop({ required: true })
  severity: 'low' | 'medium' | 'high' | 'critical';

  @Prop({ required: true })
  riskScore: number; // 0-100

  @Prop()
  ipAddress: string;

  @Prop()
  location?: string;

  @Prop()
  city?: string;

  @Prop()
  country?: string;

  @Prop()
  deviceFingerprint?: string;

  @Prop()
  userAgent?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: false })
  actionTaken: boolean;

  @Prop()
  actionType?: 'email_alert' | 'account_locked' | '2fa_required' | 'none';

  @Prop({ default: false })
  reviewed: boolean;

  @Prop()
  reviewedAt?: Date;

  @Prop()
  reviewedBy?: string;
}

export const SecurityEventSchema = SchemaFactory.createForClass(SecurityEvent);

// Índices
SecurityEventSchema.index({ userId: 1, createdAt: -1 });
SecurityEventSchema.index({ eventType: 1, severity: 1 });
SecurityEventSchema.index({ riskScore: -1 });
SecurityEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // TTL 90 días
