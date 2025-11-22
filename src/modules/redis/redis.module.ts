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
          const parsedUrl = new URL(redisUrl);
          
          console.log(`🔌 Session Redis: Connecting to ${parsedUrl.hostname}:${parsedUrl.port || '6379'} (SSL: ${useSSL ? 'enabled' : 'disabled'})...`);
          
          // For Redis Cloud with SSL
          if (useSSL) {
            client = new Redis(redisUrl, {
              family: 0, // Try both IPv4 and IPv6 (0 = auto, 4 = IPv4 only, 6 = IPv6 only)
              tls: {
                // CRITICAL: For Redis Cloud, we need proper TLS configuration
                rejectUnauthorized: false, // Accept self-signed certificates from Redis Cloud
                servername: new URL(redisUrl).hostname, // Proper SNI for TLS
              },
              // SERVERLESS CRITICAL SETTINGS
              maxRetriesPerRequest: null, // CRITICAL: null = retry indefinitely, prevents "max retries" errors in serverless
              enableOfflineQueue: false, // Don't queue commands when disconnected
              enableReadyCheck: false, // Skip PING check on connect (faster cold starts)
              lazyConnect: false, // Connect immediately
              autoResubscribe: false, // Don't auto-resubscribe to channels (not needed for cache)
              autoResendUnfulfilledCommands: false, // Don't resend commands on reconnect
              
              // Connection pooling
              connectTimeout: 15000, // 15 seconds (increased for DNS resolution)
              commandTimeout: 5000, // 5 seconds per command
              keepAlive: 0, // Disable TCP keepalive in serverless (connections are short-lived)
              
              // Retry strategy with exponential backoff
              retryStrategy: (times: number) => {
                if (times > 3) {
                  console.error('❌ Redis connection failed after 3 retries - giving up');
                  return null; // Stop retrying
                }
                const delay = Math.min(times * 500, 2000); // 500ms, 1000ms, 2000ms
                console.log(`🔄 Redis retry attempt ${times}/${3} in ${delay}ms`);
                return delay;
              },
              
              // Reconnect on error (only for recoverable errors)
              reconnectOnError: (err) => {
                const recoverableErrors = ['READONLY', 'ETIMEDOUT', 'ECONNRESET'];
                const shouldReconnect = recoverableErrors.some(e => err.message.includes(e));
                if (shouldReconnect) {
                  console.log('🔄 Redis reconnectOnError triggered:', err.message);
                }
                return shouldReconnect;
              },
            });
          } else {
            // Standard Redis URL without SSL
            client = new Redis(redisUrl, {
              family: 0, // Try both IPv4 and IPv6
              maxRetriesPerRequest: null, // CRITICAL for serverless
              enableOfflineQueue: false,
              enableReadyCheck: false,
              lazyConnect: false,
              autoResubscribe: false,
              autoResendUnfulfilledCommands: false,
              connectTimeout: 15000,
              commandTimeout: 5000,
              keepAlive: 0,
              retryStrategy: (times: number) => {
                if (times > 3) {
                  console.error('❌ Redis connection failed after 3 retries - giving up');
                  return null;
                }
                const delay = Math.min(times * 500, 2000);
                console.log(`🔄 Redis retry attempt ${times}/${3} in ${delay}ms`);
                return delay;
              },
            });
          }
        } else {
          // Use individual host/port/password configuration
          console.log(`🔌 Connecting to Redis at ${redisHost}:${configService.get<number>('REDIS_PORT') || 6379}...`);
          client = new Redis({
            host: redisHost || 'localhost',
            port: configService.get<number>('REDIS_PORT') || 6379,
            password: configService.get<string>('REDIS_PASSWORD') || undefined,
            db: configService.get<number>('REDIS_DB') || 0,
            family: 0, // Try both IPv4 and IPv6
            maxRetriesPerRequest: null, // CRITICAL for serverless
            enableOfflineQueue: false,
            enableReadyCheck: false,
            lazyConnect: false,
            autoResubscribe: false,
            autoResendUnfulfilledCommands: false,
            connectTimeout: 10000,
            commandTimeout: 5000,
            keepAlive: 0,
            retryStrategy: (times: number) => {
              if (times > 3) {
                console.error('❌ Redis connection failed after 3 retries - giving up');
                return null;
              }
              const delay = Math.min(times * 500, 2000);
              console.log(`🔄 Redis retry attempt ${times}/${3} in ${delay}ms`);
              return delay;
            },
          });
        }

        // Event handlers with debouncing to prevent log spam
        let lastErrorTime = 0;
        const ERROR_LOG_THROTTLE = 5000; // Only log errors every 5 seconds
        
        client.on('connect', () => {
          console.log('✅ Redis connected successfully');
        });

        client.on('ready', () => {
          console.log('✅ Redis ready for commands');
        });

        client.on('error', (err: Error) => {
          const now = Date.now();
          // Throttle error logging to prevent spam
          if (now - lastErrorTime > ERROR_LOG_THROTTLE) {
            // Filter out common transient errors that are handled by retry logic
            const ignoredErrors = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'];
            const shouldLog = !ignoredErrors.some(e => err.message.includes(e));
            
            if (shouldLog) {
              console.error('❌ Redis error:', err.message);
              lastErrorTime = now;
            }
          }
        });

        client.on('close', () => {
          console.log('⚠️  Redis connection closed');
        });

        client.on('reconnecting', (delay: number) => {
          console.log(`🔄 Redis reconnecting in ${delay}ms...`);
        });
        
        client.on('end', () => {
          console.log('📴 Redis connection ended');
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
