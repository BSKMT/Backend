import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type RefreshTokenDocument = RefreshToken & Document;

@Schema({ timestamps: true })
export class RefreshToken {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isRevoked: boolean;

  @Prop()
  revokedAt?: Date;

  @Prop()
  replacedByToken?: string;

  @Prop()
  ipAddress: string;

  @Prop()
  userAgent: string;

  @Prop({ default: Date.now })
  lastUsedAt: Date;

  @Prop({ default: 0 })
  usageCount: number;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

// Índices (token ya tiene unique: true, no duplicar)
// RefreshTokenSchema.index({ token: 1 }); // REMOVED: duplicate (unique: true already creates index)
RefreshTokenSchema.index({ userId: 1 });
// RefreshTokenSchema.index({ expiresAt: 1 }); // REMOVED: duplicate (TTL index below)
RefreshTokenSchema.index({ isRevoked: 1 });

// TTL index para eliminación automática de tokens expirados
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
