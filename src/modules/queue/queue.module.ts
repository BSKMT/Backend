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
          
          // For SSL connections (Redis Cloud, Upstash)
          if (useSSL) {
            return {
              redis: {
                url: redisUrl,
                tls: {
                  rejectUnauthorized: false, // Accept Redis Cloud certificates
                  servername: new URL(redisUrl).hostname, // Proper SNI
                },
                maxRetriesPerRequest: null, // CRITICAL for serverless
                enableOfflineQueue: false,
                enableReadyCheck: false,
                connectTimeout: 15000,
                commandTimeout: 5000,
                retryStrategy: (times: number) => {
                  if (times > 3) {
                    console.error('❌ Bull Queue: Redis connection failed after 3 retries');
                    return null;
                  }
                  return Math.min(times * 500, 2000);
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
          } else {
            // Non-SSL Redis URL
            return {
              redis: redisUrl,
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
            enableReadyCheck: false,
            connectTimeout: 10000,
            retryStrategy: (times: number) => {
              if (times > 3) {
                console.error('❌ Bull Queue: Redis connection failed after 3 retries');
                return null;
              }
              return Math.min(times * 500, 2000);
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
