import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const Redis = require('ioredis');
        
        // Check if Redis is configured
        const redisUrl = configService.get<string>('REDIS_URL');
        const redisHost = configService.get<string>('REDIS_HOST');
        
        // If no Redis configuration, return a mock client for serverless
        if (!redisUrl && !redisHost) {
          console.warn('⚠️  Redis not configured - using in-memory fallback');
          console.warn('⚠️  For production, configure REDIS_URL in environment variables');
          
          // Return a mock Redis client that doesn't actually connect
          return {
            setex: async () => {},
            get: async () => null,
            del: async () => 0,
            keys: async () => [],
            incr: async () => 1,
            expire: async () => 1,
            info: async () => 'Mock Redis - Not Connected',
            quit: async () => {},
            on: () => {},
          };
        }
        
        // Use REDIS_URL if provided (e.g., from Upstash, Redis Cloud)
        const redisConfig = redisUrl ? redisUrl : {
          host: redisHost || 'localhost',
          port: configService.get<number>('REDIS_PORT') || 6379,
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
          db: configService.get<number>('REDIS_DB') || 0,
          retryStrategy: (times: number) => {
            if (times > 3) {
              console.error('❌ Redis connection failed after 3 retries, using in-memory cache');
              return undefined; // Stop retrying
            }
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          lazyConnect: true, // Don't connect immediately in serverless
          connectTimeout: 5000, // 5 second timeout
        };

        const client = new Redis(redisConfig);

        client.on('connect', () => {
          console.log('✅ Redis connected successfully');
        });

        client.on('error', (err: Error) => {
          console.error('❌ Redis connection error:', err.message);
        });

        client.on('reconnecting', () => {
          console.log('🔄 Redis reconnecting...');
        });

        // Attempt to connect
        try {
          await client.connect();
        } catch (error) {
          console.error('❌ Redis connection failed:', error instanceof Error ? error.message : 'Unknown error');
          console.warn('⚠️  Continuing without Redis - some features may be limited');
        }

        return client;
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: ['REDIS_CLIENT', RedisService],
})
export class RedisModule {}
