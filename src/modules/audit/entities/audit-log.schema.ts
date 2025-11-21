import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true, collection: 'audit_logs' })
export class AuditLog {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ index: true })
  email?: string;

  @Prop({ required: true, index: true })
  action: string; // login, logout, register, password-change, password-reset, etc.

  @Prop({ required: true })
  status: 'success' | 'failure' | 'pending';

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop()
  errorMessage?: string;

  @Prop()
  timestamp: Date;

  @Prop()
  sessionId?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Índices compuestos para consultas comunes
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ status: 1, timestamp: -1 });

// TTL index para auto-eliminar logs después de 90 días (opcional)
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
