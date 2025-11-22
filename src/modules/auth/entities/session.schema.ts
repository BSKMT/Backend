import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type SessionDocument = Session & Document;

@Schema({ timestamps: true })
export class Session {
  createdAt?: Date;
  updatedAt?: Date;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  accessToken: string;

  @Prop({ required: true })
  refreshToken: string;

  @Prop({ required: true })
  ipAddress: string;

  @Prop({ required: true })
  userAgent: string;

  @Prop()
  deviceFingerprint?: string;

  @Prop()
  deviceName?: string;

  @Prop({ type: Object })
  location?: {
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: Date.now })
  lastActivityAt: Date;

  @Prop({ default: false })
  isRevoked: boolean;

  @Prop()
  revokedAt?: Date;

  @Prop()
  revokedReason?: string;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

// Índices para búsquedas eficientes
SessionSchema.index({ userId: 1 });
SessionSchema.index({ accessToken: 1 });
SessionSchema.index({ refreshToken: 1 });
// SessionSchema.index({ expiresAt: 1 }); // REMOVED: duplicate (TTL index below)
SessionSchema.index({ isRevoked: 1 });

// TTL index - MongoDB eliminará automáticamente las sesiones expiradas
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
