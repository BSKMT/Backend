import { SetMetadata } from '@nestjs/common';

export const THROTTLE_KEY = 'throttle';

export interface ThrottleConfig {
  limit: number;
  ttl: number; // en milisegundos
}

export const Throttle = (limit: number, ttl: number) =>
  SetMetadata(THROTTLE_KEY, { limit, ttl });

// Decoradores predefinidos para endpoints comunes
export const ThrottleLogin = () => Throttle(5, 15 * 60 * 1000); // 5/15min
export const ThrottleRegister = () => Throttle(3, 60 * 60 * 1000); // 3/1h
export const ThrottleResetPassword = () => Throttle(3, 60 * 60 * 1000); // 3/1h
export const ThrottleResendVerification = () => Throttle(2, 60 * 60 * 1000); // 2/1h
export const ThrottlePublic = () => Throttle(30, 60 * 1000); // 30/min
export const ThrottleAuthenticated = () => Throttle(300, 60 * 1000); // 300/min
