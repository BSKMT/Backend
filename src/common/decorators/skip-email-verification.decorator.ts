import { SetMetadata } from '@nestjs/common';

/**
 * Decorador para saltar la verificación de email en rutas específicas
 * Uso: @SkipEmailVerification()
 */
export const SkipEmailVerification = () => SetMetadata('skipEmailVerification', true);
