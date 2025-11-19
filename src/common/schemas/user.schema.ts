import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';

export type UserDocument = User & Document;

@Schema({
  timestamps: true,
  collection: 'users',
  toJSON: {
    virtuals: true,
    transform: function (doc, ret) {
      delete (ret as any).password;
      delete (ret as any).emailVerificationToken;
      delete (ret as any).passwordResetToken;
      delete (ret as any).passwordResetExpires;
      return ret;
    },
  },
})
export class User {
  // Información personal básica
  @Prop({ required: true, trim: true })
  documentType: string;

  @Prop({ required: true, unique: true, trim: true })
  documentNumber: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ required: true })
  birthDate: string;

  @Prop({ required: true, trim: true })
  birthPlace: string;

  // Información de contacto
  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ trim: true })
  whatsapp?: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
      'Email inválido',
    ],
  })
  email: string;

  @Prop({ required: true, trim: true })
  address: string;

  @Prop({ trim: true })
  neighborhood?: string;

  @Prop({ required: true, trim: true })
  city: string;

  @Prop({ required: true, trim: true })
  country: string;

  @Prop({ trim: true })
  postalCode?: string;

  // Información de género
  @Prop({ required: true, enum: ['Masculino', 'Femenino', 'Otro'] })
  binaryGender: string;

  @Prop({ trim: true })
  genderIdentity?: string;

  @Prop({ trim: true })
  occupation?: string;

  @Prop({ trim: true })
  discipline?: string;

  // Información de salud
  @Prop({ trim: true })
  bloodType?: string;

  @Prop({ trim: true })
  rhFactor?: string;

  @Prop({ trim: true })
  allergies?: string;

  @Prop({ trim: true })
  healthInsurance?: string;

  // Contacto de emergencia
  @Prop({ required: true, trim: true })
  emergencyContactName: string;

  @Prop({ required: true, trim: true })
  emergencyContactRelationship: string;

  @Prop({ required: true, trim: true })
  emergencyContactPhone: string;

  @Prop({ trim: true })
  emergencyContactAddress?: string;

  @Prop({ trim: true })
  emergencyContactNeighborhood?: string;

  @Prop({ trim: true })
  emergencyContactCity?: string;

  @Prop({ trim: true })
  emergencyContactCountry?: string;

  @Prop({ trim: true })
  emergencyContactPostalCode?: string;

  // Información de motocicleta
  @Prop({ trim: true })
  motorcycleBrand?: string;

  @Prop({ trim: true })
  motorcycleModel?: string;

  @Prop({ trim: true })
  motorcycleYear?: string;

  @Prop({ trim: true, uppercase: true })
  motorcyclePlate?: string;

  @Prop({ trim: true })
  motorcycleEngineSize?: string;

  @Prop({ trim: true })
  motorcycleColor?: string;

  @Prop()
  soatExpirationDate?: string;

  @Prop()
  technicalReviewExpirationDate?: string;

  // Información de licencia
  @Prop({ trim: true })
  licenseNumber?: string;

  @Prop({ trim: true })
  licenseCategory?: string;

  @Prop()
  licenseExpirationDate?: string;

  // Información de BSK
  @Prop({ default: true })
  isActive: boolean;

  @Prop({
    enum: ['friend', 'rider', 'rider-duo', 'pro', 'pro-duo'],
    default: 'friend',
  })
  membershipType: string;

  @Prop({ unique: true, sparse: true })
  membershipNumber?: string;

  @Prop({ default: Date.now })
  joinDate?: Date;

  @Prop({ required: true, minlength: 8, select: false })
  password: string;

  @Prop({ enum: ['user', 'admin', 'super-admin'], default: 'user' })
  role: string;

  // Imagen de perfil
  @Prop({ default: null })
  profileImage?: string;

  // Autenticación y seguridad
  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ select: false })
  emailVerificationToken?: string;

  @Prop({ select: false })
  passwordResetToken?: string;

  @Prop({ select: false })
  passwordResetExpires?: Date;

  @Prop()
  lastLogin?: Date;

  @Prop({ default: Date.now })
  lastActivity?: Date;

  @Prop({ default: 0, max: 5 })
  loginAttempts: number;

  @Prop()
  lockUntil?: Date;

  // Términos y condiciones
  @Prop({ default: false, required: true })
  acceptedTerms: boolean;

  @Prop({ default: false, required: true })
  acceptedPrivacyPolicy: boolean;

  @Prop({ default: false, required: true })
  acceptedDataProcessing: boolean;

  // Eventos y actividades
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Event' }] })
  events?: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Event' }] })
  favoriteEvents?: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Event' }] })
  attendedEvents?: Types.ObjectId[];

  // Timestamps (added automatically by timestamps: true)
  createdAt?: Date;
  updatedAt?: Date;

  // Methods (defined on UserDocument)
  comparePassword?: (candidatePassword: string) => Promise<boolean>;
  getPublicProfile?: () => any;
  updateLastLogin?: () => Promise<UserDocument>;
  incrementLoginAttempts?: () => Promise<any>;
  resetLoginAttempts?: () => Promise<any>;
  isAccountLocked?: () => boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Índices
UserSchema.index({ membershipType: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ city: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ lastLogin: -1 });
UserSchema.index({ lastActivity: -1 });
UserSchema.index({ lockUntil: 1 }, { expireAfterSeconds: 0 });

// Virtual para nombre completo
UserSchema.virtual('fullName').get(function (this: UserDocument) {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual para verificar si está bloqueado
UserSchema.virtual('isLocked').get(function (this: UserDocument) {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

// Middleware para encriptar contraseña antes de guardar
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Middleware para generar número de membresía
UserSchema.pre('save', async function (next) {
  if (this.isNew && !this.membershipNumber) {
    const UserModel = this.constructor as any;
    const count = await UserModel.countDocuments();
    this.membershipNumber = `BSK${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Métodos de instancia
UserSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  try {
    if (!candidatePassword || !this.password) {
      return false;
    }
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Error comparing passwords');
    return false;
  }
};

UserSchema.methods.getPublicProfile = function () {
  return {
    _id: this._id,
    id: this._id,
    documentType: this.documentType,
    documentNumber: this.documentNumber,
    firstName: this.firstName,
    lastName: this.lastName,
    fullName: `${this.firstName} ${this.lastName}`,
    birthDate: this.birthDate,
    birthPlace: this.birthPlace,
    phone: this.phone,
    whatsapp: this.whatsapp,
    email: this.email,
    address: this.address,
    neighborhood: this.neighborhood,
    city: this.city,
    country: this.country,
    postalCode: this.postalCode,
    binaryGender: this.binaryGender,
    genderIdentity: this.genderIdentity,
    occupation: this.occupation,
    discipline: this.discipline,
    bloodType: this.bloodType,
    rhFactor: this.rhFactor,
    allergies: this.allergies,
    healthInsurance: this.healthInsurance,
    emergencyContactName: this.emergencyContactName,
    emergencyContactRelationship: this.emergencyContactRelationship,
    emergencyContactPhone: this.emergencyContactPhone,
    emergencyContactAddress: this.emergencyContactAddress,
    emergencyContactNeighborhood: this.emergencyContactNeighborhood,
    emergencyContactCity: this.emergencyContactCity,
    emergencyContactCountry: this.emergencyContactCountry,
    emergencyContactPostalCode: this.emergencyContactPostalCode,
    motorcycleBrand: this.motorcycleBrand,
    motorcycleModel: this.motorcycleModel,
    motorcycleYear: this.motorcycleYear,
    motorcyclePlate: this.motorcyclePlate,
    motorcycleEngineSize: this.motorcycleEngineSize,
    motorcycleColor: this.motorcycleColor,
    soatExpirationDate: this.soatExpirationDate,
    technicalReviewExpirationDate: this.technicalReviewExpirationDate,
    licenseNumber: this.licenseNumber,
    licenseCategory: this.licenseCategory,
    licenseExpirationDate: this.licenseExpirationDate,
    isActive: this.isActive,
    membershipType: this.membershipType,
    membershipNumber: this.membershipNumber,
    joinDate: this.joinDate,
    role: this.role,
    profileImage: this.profileImage,
    isEmailVerified: this.isEmailVerified,
    acceptedTerms: this.acceptedTerms,
    acceptedPrivacyPolicy: this.acceptedPrivacyPolicy,
    acceptedDataProcessing: this.acceptedDataProcessing,
    events: this.events,
    favoriteEvents: this.favoriteEvents,
    attendedEvents: this.attendedEvents,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

UserSchema.methods.updateLastLogin = function () {
  this.lastLogin = new Date();
  return this.save();
};

UserSchema.methods.incrementLoginAttempts = function () {
  if (this.lockUntil && this.lockUntil < new Date()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 },
    });
  }

  const updates: any = { $inc: { loginAttempts: 1 } };

  if (this.loginAttempts + 1 >= 5 && !this.isAccountLocked()) {
    updates.$set = { lockUntil: new Date(Date.now() + 2 * 60 * 60 * 1000) };
  }

  return this.updateOne(updates);
};

UserSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
  });
};

UserSchema.methods.isAccountLocked = function () {
  return !!(this.lockUntil && this.lockUntil > new Date());
};
