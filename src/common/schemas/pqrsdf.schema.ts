import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PQRSDFDocument = PQRSDF & Document;

class Adjunto {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true })
  tamano: number;

  @Prop({ required: true })
  tipo: string;

  @Prop({ required: true })
  url: string;

  @Prop({ default: Date.now })
  fechaSubida: Date;
}

class Mensaje {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  contenido: string;

  @Prop({ required: true, enum: ['usuario', 'sistema', 'admin'] })
  tipo: string;

  @Prop()
  autorId?: string;

  @Prop({ required: true })
  autorNombre: string;

  @Prop({ default: Date.now })
  fechaCreacion: Date;

  @Prop({ type: [Adjunto] })
  adjuntos?: Adjunto[];

  @Prop({ default: false })
  esInterno?: boolean;
}

class TimelineEvento {
  @Prop({ required: true })
  id: string;

  @Prop({
    required: true,
    enum: ['creada', 'actualizada', 'respondida', 'cerrada', 'escalada', 'mensaje'],
  })
  tipo: string;

  @Prop({ required: true })
  descripcion: string;

  @Prop({ default: Date.now })
  fecha: Date;

  @Prop()
  autorId?: string;

  @Prop()
  autorNombre?: string;

  @Prop({ type: Map })
  metadata?: Map<string, any>;
}

class DatosBancariosReembolso {
  @Prop({ required: true })
  nombreTitular: string;

  @Prop({ required: true, enum: ['CC', 'CE', 'NIT', 'TI', 'PA'] })
  tipoDocumento: string;

  @Prop({ required: true })
  numeroDocumento: string;

  @Prop({ required: true })
  banco: string;

  @Prop({ required: true, enum: ['ahorros', 'corriente'] })
  tipoCuenta: string;

  @Prop({ required: true })
  numeroCuenta: string;

  @Prop({ required: true })
  emailConfirmacion: string;

  @Prop({ required: true })
  telefonoContacto: string;
}

@Schema({
  timestamps: true,
  collection: 'pqrsdf',
})
export class PQRSDF {
  @Prop({ required: true, unique: true })
  numeroSolicitud: string;

  @Prop({ required: true })
  usuarioId: string;

  @Prop({
    required: true,
    enum: ['peticion', 'queja', 'reclamo', 'sugerencia', 'denuncia', 'felicitacion'],
  })
  categoria: string;

  @Prop({
    enum: ['general', 'reembolso', 'cambio_datos', 'certificado', 'otro'],
  })
  subcategoria?: string;

  @Prop({ required: true, trim: true })
  asunto: string;

  @Prop({ required: true })
  descripcion: string;

  @Prop({
    enum: ['en_revision', 'respondida', 'cerrada', 'escalada'],
    default: 'en_revision',
  })
  estado: string;

  @Prop({
    enum: ['baja', 'media', 'alta', 'urgente'],
    default: 'media',
  })
  prioridad: string;

  @Prop({ default: Date.now })
  fechaCreacion: Date;

  @Prop({ default: Date.now })
  fechaActualizacion: Date;

  @Prop()
  fechaCierre?: Date;

  @Prop()
  fechaLimiteRespuesta?: Date;

  @Prop({ type: [Adjunto], default: [] })
  adjuntos: Adjunto[];

  @Prop({ type: [Mensaje], default: [] })
  mensajes: Mensaje[];

  @Prop({ type: [TimelineEvento], default: [] })
  timeline: TimelineEvento[];

  @Prop()
  asignadoA?: string;

  @Prop()
  asignadoANombre?: string;

  @Prop()
  respuestaFinal?: string;

  @Prop()
  fechaRespuesta?: Date;

  @Prop({ type: DatosBancariosReembolso })
  datosBancarios?: DatosBancariosReembolso;

  @Prop()
  montoReembolso?: number;

  @Prop()
  estadoReembolso?: string;

  @Prop()
  fechaReembolso?: Date;

  @Prop({ default: 0 })
  tiempoRespuestaDias?: number;

  @Prop({ default: false })
  requiereAtencionUrgente?: boolean;

  @Prop({ type: Map })
  metadatos?: Map<string, any>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PQRSDFSchema = SchemaFactory.createForClass(PQRSDF);

// Índices (numeroSolicitud ya tiene unique: true, no duplicar)
// PQRSDFSchema.index({ numeroSolicitud: 1 }); // REMOVED: duplicate (unique: true already creates index)
PQRSDFSchema.index({ usuarioId: 1 });
PQRSDFSchema.index({ categoria: 1 });
PQRSDFSchema.index({ estado: 1 });
PQRSDFSchema.index({ prioridad: 1 });
PQRSDFSchema.index({ fechaCreacion: -1 });
PQRSDFSchema.index({ fechaLimiteRespuesta: 1 });

// Generar número de solicitud automáticamente
PQRSDFSchema.pre('save', async function (next) {
  if (this.isNew && !this.numeroSolicitud) {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    this.numeroSolicitud = `PQRSDF-${year}-${random}`;
  }
  next();
});

// Calcular fecha límite de respuesta
PQRSDFSchema.pre('save', function (next) {
  if (this.isNew && !this.fechaLimiteRespuesta) {
    const diasPorPrioridad: Record<string, number> = {
      baja: 15,
      media: 10,
      alta: 5,
      urgente: 2,
    };
    const dias = diasPorPrioridad[this.prioridad] || 10;
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + dias);
    this.fechaLimiteRespuesta = fechaLimite;
  }
  next();
});
