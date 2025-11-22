import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-ioredis';

@Global()
@Module({
  imports: [    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const redisHost = configService.get<string>('REDIS_HOST');
        const redisEnabled = configService.get<string>('REDIS_ENABLED', 'auto') === 'true';
        
        // Auto-detect: if REDIS_URL or REDIS_HOST exists, enable Redis
        const shouldUseRedis = redisEnabled || redisUrl || redisHost;
        
        if (!shouldUseRedis) {
          console.log('⚠️  Redis not configured - using in-memory cache');
          console.log('⚠️  For production, set REDIS_URL in environment variables');
          return {
            ttl: 60 * 5, // 5 minutes default TTL
          };
        }

        // Use REDIS_URL if provided (e.g., from Upstash)
        if (redisUrl) {
          console.log('✅ Redis cache enabled - using REDIS_URL');
          return {
            store: redisStore as any,
            url: redisUrl,
            ttl: 60 * 5, // 5 minutes default TTL
            retryStrategy: (times: number) => {
              if (times > 3) {
                console.error('❌ Redis connection failed after 3 retries, using in-memory cache');
                return undefined; // stop retrying
              }
              return Math.min(times * 100, 3000);
            },
          };
        }

        // Fallback to host/port configuration
        const redisPort = configService.get<number>('REDIS_PORT') || 6379;
        const redisPassword = configService.get<string>('REDIS_PASSWORD');

        console.log(`✅ Redis cache enabled - connecting to ${redisHost}:${redisPort}`);

        return {
          store: redisStore as any,
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          ttl: 60 * 5, // 5 minutes default TTL
          retryStrategy: (times: number) => {
            if (times > 3) {
              console.error('❌ Redis connection failed after 3 retries, using in-memory cache');
              return undefined; // stop retrying
            }
            return Math.min(times * 100, 3000);
          },
        };
      },
      inject: [ConfigService],
      isGlobal: true,
    }),
  ],
  exports: [CacheModule],
})
export class RedisModule {
  constructor() {
    console.log('✅ Redis module initialized');
  }
}
