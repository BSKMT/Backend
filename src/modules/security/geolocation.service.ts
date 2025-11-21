import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface GeoLocation {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  full?: string;
}

@Injectable()
export class GeoLocationService {
  private readonly logger = new Logger(GeoLocationService.name);
  private readonly API_URL = 'http://ip-api.com/json';
  private readonly cache = new Map<string, { data: GeoLocation; timestamp: number }>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

  constructor(private readonly httpService: HttpService) {}

  /**
   * Obtener geolocalización de una IP
   */
  async getLocation(ip: string): Promise<GeoLocation | null> {
    // Skip localhost/private IPs
    if (this.isPrivateIP(ip)) {
      return {
        ip,
        city: 'Local',
        country: 'Local',
        full: 'Local Network',
      };
    }

    // Verificar cache
    const cached = this.cache.get(ip);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      // Consultar API (gratis, sin API key, límite: 45 req/min)
      const response = await firstValueFrom(
        this.httpService.get(`${this.API_URL}/${ip}?fields=status,message,country,countryCode,region,city,lat,lon,timezone,isp`)
      );

      if (response.data.status === 'success') {
        const location: GeoLocation = {
          ip,
          city: response.data.city,
          region: response.data.region,
          country: response.data.country,
          countryCode: response.data.countryCode,
          latitude: response.data.lat,
          longitude: response.data.lon,
          timezone: response.data.timezone,
          isp: response.data.isp,
          full: `${response.data.city}, ${response.data.region}, ${response.data.country}`,
        };

        // Guardar en cache
        this.cache.set(ip, { data: location, timestamp: Date.now() });

        return location;
      } else {
        this.logger.warn(`Geolocation API error for IP ${ip}: ${response.data.message}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Error getting geolocation for IP ${ip}:`, error);
      return null;
    }
  }

  /**
   * Calcular distancia entre dos coordenadas (fórmula de Haversine)
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distancia en km
    
    return Math.round(distance);
  }

  /**
   * Verificar si la ubicación es sospechosa (muy lejos de la última conocida)
   */
  async isSuspiciousLocation(
    currentLocation: GeoLocation,
    lastLocation: GeoLocation | null,
    maxDistanceKm: number = 500,
  ): Promise<{ suspicious: boolean; distance?: number }> {
    if (!lastLocation || !currentLocation.latitude || !lastLocation.latitude) {
      return { suspicious: false };
    }

    const distance = this.calculateDistance(
      lastLocation.latitude!,
      lastLocation.longitude!,
      currentLocation.latitude!,
      currentLocation.longitude!
    );

    return {
      suspicious: distance > maxDistanceKm,
      distance,
    };
  }

  /**
   * Verificar si es una IP privada/local
   */
  private isPrivateIP(ip: string): boolean {
    if (ip === 'localhost' || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
      return true;
    }

    // Rangos privados
    const privateRanges = [
      /^10\./,
      /^192\.168\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    ];

    return privateRanges.some(range => range.test(ip));
  }

  /**
   * Convertir grados a radianes
   */
  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Limpiar cache antiguo
   */
  cleanCache(): void {
    const now = Date.now();
    for (const [ip, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.CACHE_TTL) {
        this.cache.delete(ip);
      }
    }
    this.logger.log(`Cache cleaned. Remaining entries: ${this.cache.size}`);
  }
}
