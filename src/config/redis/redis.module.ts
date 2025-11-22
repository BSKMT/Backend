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

        // Use REDIS_URL if provided (with proper SSL configuration)
        if (redisUrl) {
          const useSSL = redisUrl.startsWith('rediss://');
          console.log(`✅ Redis cache enabled - using REDIS_URL (SSL: ${useSSL})`);
          
          // For SSL connections
          if (useSSL) {
            return {
              store: redisStore as any,
              url: redisUrl,
              ttl: 60 * 5, // 5 minutes default TTL
              tls: {
                rejectUnauthorized: false,
                servername: new URL(redisUrl).hostname,
              },
              maxRetriesPerRequest: null,
              enableOfflineQueue: false,
              enableReadyCheck: false,
              connectTimeout: 15000,
              retryStrategy: (times: number) => {
                if (times > 3) {
                  console.error('❌ Cache Redis: Connection failed after 3 retries, using in-memory cache');
                  return undefined;
                }
                return Math.min(times * 500, 2000);
              },
            };
          } else {
            // Non-SSL URL
            return {
              store: redisStore as any,
              url: redisUrl,
              ttl: 60 * 5,
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
              retryStrategy: (times: number) => {
                if (times > 3) {
                  console.error('❌ Cache Redis: Connection failed after 3 retries, using in-memory cache');
                  return undefined;
                }
                return Math.min(times * 500, 2000);
              },
            };
          }
        }

        // Fallback to host/port configuration (ONLY if REDIS_URL is not set)
        if (redisHost) {
          const redisPort = configService.get<number>('REDIS_PORT') || 6379;
          const redisPassword = configService.get<string>('REDIS_PASSWORD');

          console.log(`✅ Redis cache enabled - connecting to ${redisHost}:${redisPort}`);

          return {
            store: redisStore as any,
            host: redisHost,
            port: redisPort,
            password: redisPassword,
            ttl: 60 * 5,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            connectTimeout: 10000,
            retryStrategy: (times: number) => {
              if (times > 3) {
                console.error('❌ Cache Redis: Connection failed after 3 retries, using in-memory cache');
                return undefined;
              }
              return Math.min(times * 500, 2000);
            },
          };
        }

        // Should never reach here (caught by shouldUseRedis check above)
        console.warn('⚠️  Unexpected: Redis config reached fallback');
        return { ttl: 60 * 5 };
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
