import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailQueueProcessor } from './email-queue.processor';
import { EmailQueueService } from './email-queue.service';

@Module({  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const redisHost = configService.get<string>('REDIS_HOST');
        
        // If no Redis is configured, Bull won't work in serverless
        // Return minimal config to prevent connection attempts
        if (!redisUrl && !redisHost) {
          console.warn('⚠️  Bull Queue disabled - Redis not configured');
          console.warn('⚠️  Email queuing will not work without Redis');
          // Return null connection to prevent localhost attempts
          return {
            redis: null,
            defaultJobOptions: {
              attempts: 1,
              removeOnComplete: true,
            },
          };
        }
        
        // Use REDIS_URL if provided (proper SSL configuration)
        if (redisUrl) {
          const useSSL = redisUrl.startsWith('rediss://');
          console.log(`✅ Bull Queue enabled - using REDIS_URL (SSL: ${useSSL})`);
          
          // Parse Redis URL to get connection details
          const parsedUrl = new URL(redisUrl);
          
          // Get port from URL, or use default (6379 for both SSL and non-SSL)
          // Redis Cloud typically uses port 6379 even for SSL (rediss://)
          let port = 6379;
          if (parsedUrl.port) {
            port = parseInt(parsedUrl.port, 10);
          }
          
          console.log(`🔌 Bull Queue: Connecting to ${parsedUrl.hostname}:${port} (SSL: ${useSSL})`);
          
          const redisConfig: any = {
            host: parsedUrl.hostname,
            port: port,
          };

          // Add password if present
          if (parsedUrl.password) {
            redisConfig.password = parsedUrl.password;
          }

          // Add username if present (for ACL)
          if (parsedUrl.username && parsedUrl.username !== 'default') {
            redisConfig.username = parsedUrl.username;
          }
          
          // For SSL connections (Redis Cloud, Upstash)
          if (useSSL) {
            redisConfig.tls = {
              rejectUnauthorized: false, // Accept Redis Cloud certificates
              servername: parsedUrl.hostname, // Proper SNI
            };
          }

          // Add serverless-optimized settings
          redisConfig.maxRetriesPerRequest = null; // CRITICAL for serverless
          redisConfig.enableOfflineQueue = true; // CHANGED: Allow queueing while connecting
          redisConfig.enableReadyCheck = false;
          redisConfig.lazyConnect = false; // Connect immediately
          redisConfig.connectTimeout = 30000; // 30 seconds (generous for Vercel cold starts)
          redisConfig.commandTimeout = 10000; // 10 seconds per command (generous for serverless)
          redisConfig.retryStrategy = (times: number) => {
            if (times > 3) {
              console.error('❌ Bull Queue: Redis connection failed after 3 retries');
              return null;
            }
            const delay = Math.min(times * 500, 2000);
            console.log(`🔄 Bull Queue: Retry attempt ${times}/3 in ${delay}ms`);
            return delay;
          };

          return {
            redis: redisConfig,
            defaultJobOptions: {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 2000,
              },
              removeOnComplete: true,
              removeOnFail: false,
            },
          };
        }
        
        // Fallback to host/port configuration
        console.log(`✅ Bull Queue enabled - connecting to ${redisHost}:${configService.get<number>('REDIS_PORT') || 6379}`);
        return {
          redis: {
            host: redisHost,
            port: configService.get<number>('REDIS_PORT') || 6379,
            password: configService.get<string>('REDIS_PASSWORD') || undefined,
            db: configService.get<number>('REDIS_DB') || 0,
            maxRetriesPerRequest: null,
            enableOfflineQueue: true, // Allow queueing while connecting
            enableReadyCheck: false,
            lazyConnect: false,
            connectTimeout: 10000,
            retryStrategy: (times: number) => {
              if (times > 3) {
                console.error('❌ Bull Queue: Redis connection failed after 3 retries');
                return null;
              }
              const delay = Math.min(times * 500, 2000);
              console.log(`🔄 Bull Queue: Retry attempt ${times}/3 in ${delay}ms`);
              return delay;
            },
          },
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
            removeOnComplete: true,
            removeOnFail: false,
          },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  providers: [EmailQueueProcessor, EmailQueueService],
  exports: [EmailQueueService],
})
export class QueueModule {}
