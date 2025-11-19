import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-ioredis';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisEnabled = configService.get<string>('REDIS_ENABLED', 'false') === 'true';
        
        if (!redisEnabled) {
          console.log('⚠️  Redis disabled - using in-memory cache');
          return {
            ttl: 60 * 5, // 5 minutes default TTL
          };
        }

        const redisHost = configService.get<string>('REDIS_HOST') || 'localhost';
        const redisPort = configService.get<number>('REDIS_PORT') || 6379;
        const redisPassword = configService.get<string>('REDIS_PASSWORD');

        console.log(`✅ Redis enabled - connecting to ${redisHost}:${redisPort}`);

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
