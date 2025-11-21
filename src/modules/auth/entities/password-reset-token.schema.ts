import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type PasswordResetTokenDocument = PasswordResetToken & Document;

@Schema({ timestamps: true })
export class PasswordResetToken {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isUsed: boolean;

  @Prop()
  usedAt?: Date;

  @Prop()
  ipAddress: string;

  @Prop()
  userAgent: string;
}

export const PasswordResetTokenSchema = SchemaFactory.createForClass(PasswordResetToken);

// Índices
PasswordResetTokenSchema.index({ token: 1 });
PasswordResetTokenSchema.index({ userId: 1 });
PasswordResetTokenSchema.index({ expiresAt: 1 });
PasswordResetTokenSchema.index({ isUsed: 1 });

// TTL index
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
