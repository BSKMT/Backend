import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MembershipDocument = Membership & Document;

class MembershipBenefit {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  icon: string;

  @Prop({
    required: true,
    enum: ['events', 'support', 'commercial', 'digital', 'emergency', 'education', 'social'],
  })
  category: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true })
  priority: number;
}

class MembershipPricing {
  @Prop({ required: true })
  initial: number;

  @Prop()
  withDiscount?: number;

  @Prop()
  early_bird?: number;

  @Prop()
  student?: number;

  @Prop()
  family?: number;

  @Prop()
  corporate?: number;
}

class MembershipPeriod {
  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  renewalStartDate?: Date;

  @Prop()
  renewalDeadline?: Date;
}

class MembershipLevel {
  @Prop({ required: true })
  tier: number;

  @Prop({ required: true })
  name: string;

  @Prop({ type: [String] })
  upgradeRequirements?: string[];
}

class AutoRenewal {
  @Prop({ default: false })
  enabled: boolean;

  @Prop({ type: [Number], default: [30, 15, 7, 1] })
  notificationDays: number[];

  @Prop()
  gracePeriodDays?: number;
}

class MembershipCapacity {
  @Prop()
  maxMembers?: number;

  @Prop({ default: 0 })
  currentMembers?: number;

  @Prop({ default: false })
  waitingList?: boolean;
}

@Schema({
  timestamps: true,
  collection: 'memberships',
})
export class Membership {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, trim: true })
  slug: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  shortDescription?: string;

  @Prop({ type: MembershipPricing, required: true })
  pricing: MembershipPricing;

  @Prop({ type: MembershipPeriod, required: true })
  period: MembershipPeriod;

  @Prop({ default: true })
  requiresRenewal: boolean;

  @Prop({ enum: ['monthly', 'quarterly', 'biannual', 'annual', 'lifetime'] })
  renewalType?: string;

  @Prop({ default: false })
  isLifetime: boolean;

  @Prop({
    enum: ['active', 'inactive', 'draft', 'archived'],
    default: 'active',
  })
  status: string;

  @Prop({ type: [MembershipBenefit], default: [] })
  benefits: MembershipBenefit[];

  @Prop({ type: MembershipLevel, required: true })
  level: MembershipLevel;

  @Prop({ type: AutoRenewal })
  autoRenewal: AutoRenewal;

  @Prop({ type: MembershipCapacity })
  capacity?: MembershipCapacity;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  displayOrder: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const MembershipSchema = SchemaFactory.createForClass(Membership);

// Índices
MembershipSchema.index({ slug: 1 });
MembershipSchema.index({ status: 1 });
MembershipSchema.index({ isActive: 1 });
MembershipSchema.index({ 'level.tier': 1 });
MembershipSchema.index({ displayOrder: 1 });

// Generar slug automáticamente si no existe
MembershipSchema.pre('save', function (next) {
  if (this.isNew && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});
