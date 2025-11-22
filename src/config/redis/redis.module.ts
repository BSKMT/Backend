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
          // Debug: Show URL format (hide password for security)
          const debugUrl = redisUrl.replace(/:([^:@]+)@/, ':****@');
          console.log(`✅ Redis cache enabled - using REDIS_URL (SSL: ${useSSL})`);
          console.log(`🔍 DEBUG: URL format: ${debugUrl}`);
          
          // Parse Redis URL to get connection details
          // cache-manager-ioredis doesn't parse URLs correctly, so we must extract manually
          const parsedUrl = new URL(redisUrl);
          
          // Get port from URL, or use default (6379 for both SSL and non-SSL)
          // Redis Cloud typically uses port 6379 even for SSL (rediss://)
          let port = 6379;
          if (parsedUrl.port) {
            port = parseInt(parsedUrl.port, 10);
          }
          
          console.log(`🔌 Cache Redis: Connecting to ${parsedUrl.hostname}:${port} (SSL: ${useSSL})`);
          
          const cacheConfig: any = {
            store: redisStore as any,
            host: parsedUrl.hostname,
            port: port,
            ttl: 60 * 5, // 5 minutes default TTL
            maxRetriesPerRequest: null,
            enableOfflineQueue: true, // Allow cache operations to queue during connection
            enableReadyCheck: false,
            lazyConnect: false,
            connectTimeout: 15000,
            retryStrategy: (times: number) => {
              if (times > 3) {
                console.error('❌ Cache Redis: Connection failed after 3 retries, using in-memory cache');
                return undefined;
              }
              const delay = Math.min(times * 500, 2000);
              console.log(`🔄 Cache Redis: Retry attempt ${times}/3 in ${delay}ms`);
              return delay;
            },
          };

          // Add password if present
          if (parsedUrl.password) {
            cacheConfig.password = parsedUrl.password;
          }

          // Add username if present (for ACL)
          if (parsedUrl.username && parsedUrl.username !== 'default') {
            cacheConfig.username = parsedUrl.username;
          }
          
          // For SSL connections (Redis Cloud, Upstash)
          if (useSSL) {
            cacheConfig.tls = {
              rejectUnauthorized: false,
              servername: parsedUrl.hostname,
            };
          }

          return cacheConfig;
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
            enableOfflineQueue: true, // CHANGED: Allow cache operations to queue during connection
            enableReadyCheck: false,
            lazyConnect: false,
            connectTimeout: 10000,
            retryStrategy: (times: number) => {
              if (times > 3) {
                console.error('❌ Cache Redis: Connection failed after 3 retries, using in-memory cache');
                return undefined;
              }
              const delay = Math.min(times * 500, 2000);
              console.log(`🔄 Cache Redis: Retry attempt ${times}/3 in ${delay}ms`);
              return delay;
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
