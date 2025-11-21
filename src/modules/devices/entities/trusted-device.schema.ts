import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TrustedDeviceDocument = TrustedDevice & Document;

@Schema({ timestamps: true, collection: 'trusted_devices' })
export class TrustedDevice {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  deviceFingerprint: string;

  @Prop({ required: true })
  deviceName: string;

  @Prop()
  deviceType: 'desktop' | 'mobile' | 'tablet';

  @Prop()
  browser: string;

  @Prop()
  os: string;

  @Prop()
  ipAddress: string;

  @Prop()
  location?: string;

  @Prop()
  city?: string;

  @Prop()
  country?: string;

  @Prop({ required: true, unique: true })
  rememberToken: string; // Token para cookie "remember device"

  @Prop({ required: true })
  expiresAt: Date; // 30 días desde creación

  @Prop({ default: false })
  isRevoked: boolean;

  @Prop()
  revokedAt?: Date;

  @Prop()
  revokedReason?: string;

  @Prop({ default: Date.now })
  lastUsedAt: Date;

  @Prop()
  userAgent: string;
}

export const TrustedDeviceSchema = SchemaFactory.createForClass(TrustedDevice);

// Índices
TrustedDeviceSchema.index({ userId: 1, deviceFingerprint: 1 });
TrustedDeviceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL automático
