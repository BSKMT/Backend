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

// Índices (token ya tiene unique: true, no duplicar)
// PasswordResetTokenSchema.index({ token: 1 }); // REMOVED: duplicate (unique: true already creates index)
PasswordResetTokenSchema.index({ userId: 1 });
// PasswordResetTokenSchema.index({ expiresAt: 1 }); // REMOVED: duplicate (TTL index below)
PasswordResetTokenSchema.index({ isUsed: 1 });

// TTL index para eliminación automática de tokens expirados
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
