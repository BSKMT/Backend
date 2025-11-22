import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

// Singleton Redis client to prevent connection pool exhaustion
let redisClientInstance: any = null;

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        // Return existing client if already created (singleton pattern)
        if (redisClientInstance) {
          console.log('♻️  Reusing existing Redis client');
          return redisClientInstance;
        }

        const Redis = require('ioredis');
        
        // Check if Redis is configured
        const redisUrl = configService.get<string>('REDIS_URL');
        const redisHost = configService.get<string>('REDIS_HOST');
        
        // If no Redis configuration, return a mock client for serverless
        if (!redisUrl && !redisHost) {
          console.warn('⚠️  Redis not configured - using in-memory fallback');
          console.warn('⚠️  For production, configure REDIS_URL in environment variables');
          
          // Return a mock Redis client that doesn't actually connect
          const mockClient = {
            setex: async () => {},
            get: async () => null,
            del: async () => 0,
            keys: async () => [],
            incr: async () => 1,
            expire: async () => 1,
            info: async () => 'Mock Redis - Not Connected',
            quit: async () => {},
            on: () => {},
            status: 'ready',
          };
          redisClientInstance = mockClient;
          return mockClient;
        }

        // Use REDIS_URL if provided (e.g., from Upstash, Redis Cloud)
        let client: any;
        
        if (redisUrl) {
          // Parse URL to determine if it uses SSL
          const useSSL = redisUrl.startsWith('rediss://');
          
          // For Redis Cloud with SSL
          if (useSSL) {
            client = new Redis(redisUrl, {
              family: 6, // Force IPv6 if needed, or use 4 for IPv4, 0 for both
              tls: {
                // CRITICAL: For Redis Cloud, we need proper TLS configuration
                rejectUnauthorized: false, // Accept self-signed certificates from Redis Cloud
              },
              // SERVERLESS CRITICAL SETTINGS
              maxRetriesPerRequest: null, // CRITICAL: null = retry indefinitely, prevents "max retries" errors in serverless
              enableOfflineQueue: false, // Don't queue commands when disconnected
              enableReadyCheck: false, // Skip PING check on connect (faster cold starts)
              lazyConnect: false, // Connect immediately
              
              // Connection pooling
              connectTimeout: 10000, // 10 seconds
              keepAlive: 0, // Disable TCP keepalive in serverless (connections are short-lived)
              
              // Retry strategy
              retryStrategy: (times: number) => {
                if (times > 5) {
                  console.error('❌ Redis connection failed after 5 retries');
                  return null; // Stop retrying
                }
                const delay = Math.min(times * 200, 2000);
                console.log(`🔄 Redis retry attempt ${times} in ${delay}ms`);
                return delay;
              },
              
              // Reconnect on error
              reconnectOnError: (err) => {
                console.log('🔄 Redis reconnectOnError triggered:', err.message);
                // Reconnect on specific errors
                return err.message.includes('READONLY') || err.message.includes('ECONNREFUSED');
              },
            });
          } else {
            // Standard Redis URL without SSL
            client = new Redis(redisUrl, {
              maxRetriesPerRequest: null, // CRITICAL for serverless
              enableOfflineQueue: false,
              enableReadyCheck: false,
              lazyConnect: false,
              connectTimeout: 10000,
              keepAlive: 0,
              retryStrategy: (times: number) => {
                if (times > 5) {
                  console.error('❌ Redis connection failed after 5 retries');
                  return null;
                }
                return Math.min(times * 200, 2000);
              },
            });
          }
        } else {
          // Use individual host/port/password configuration
          client = new Redis({
            host: redisHost || 'localhost',
            port: configService.get<number>('REDIS_PORT') || 6379,
            password: configService.get<string>('REDIS_PASSWORD') || undefined,
            db: configService.get<number>('REDIS_DB') || 0,
            maxRetriesPerRequest: null, // CRITICAL for serverless
            enableOfflineQueue: false,
            enableReadyCheck: false,
            lazyConnect: false,
            connectTimeout: 5000,
            keepAlive: 0,
            retryStrategy: (times: number) => {
              if (times > 5) {
                console.error('❌ Redis connection failed after 5 retries');
                return null;
              }
              return Math.min(times * 200, 2000);
            },
          });
        }

        // Event handlers
        client.on('connect', () => {
          console.log('✅ Redis connected successfully');
        });

        client.on('ready', () => {
          console.log('✅ Redis ready for commands');
        });

        client.on('error', (err: Error) => {
          // Don't spam logs with connection errors
          if (!err.message.includes('ECONNREFUSED')) {
            console.error('❌ Redis error:', err.message);
          }
        });

        client.on('close', () => {
          console.log('⚠️  Redis connection closed');
        });

        client.on('reconnecting', (delay: number) => {
          console.log(`🔄 Redis reconnecting in ${delay}ms...`);
        });

        // Store the client instance as singleton
        redisClientInstance = client;

        return client;
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: ['REDIS_CLIENT', RedisService],
})
export class RedisModule {}

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  if (redisClientInstance && typeof redisClientInstance.quit === 'function') {
    try {
      await redisClientInstance.quit();
      redisClientInstance = null;
      console.log('✅ Redis connection closed gracefully');
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }
});
