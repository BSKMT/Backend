import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type EmailVerificationTokenDocument = EmailVerificationToken & Document;

@Schema({ timestamps: true })
export class EmailVerificationToken {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ required: true })
  email: string;

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

export const EmailVerificationTokenSchema = SchemaFactory.createForClass(EmailVerificationToken);

// Índices (token ya tiene unique: true, no duplicar)
// EmailVerificationTokenSchema.index({ token: 1 }); // REMOVED: duplicate (unique: true already creates index)
EmailVerificationTokenSchema.index({ userId: 1 });
EmailVerificationTokenSchema.index({ email: 1 });
// EmailVerificationTokenSchema.index({ expiresAt: 1 }); // REMOVED: duplicate (TTL index below)
EmailVerificationTokenSchema.index({ isUsed: 1 });

// TTL index para eliminación automática de tokens expirados
EmailVerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
