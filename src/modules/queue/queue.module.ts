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
        // Log warning but don't crash
        if (!redisUrl && !redisHost) {
          console.warn('⚠️  Bull Queue disabled - Redis not configured');
          console.warn('⚠️  Email queuing will not work without Redis');
        }
        
        // Parse Redis URL or use individual config
        const redisConfig = redisUrl 
          ? redisUrl 
          : {
              host: redisHost || 'localhost',
              port: configService.get<number>('REDIS_PORT') || 6379,
              password: configService.get<string>('REDIS_PASSWORD') || undefined,
              db: configService.get<number>('REDIS_DB') || 0,
              maxRetriesPerRequest: 3,
              enableReadyCheck: false, // Better for serverless
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
