import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './config/database/database.module';
import { RedisModule } from './config/redis/redis.module';
import { UsersModule } from './modules/users/users.module';
import { AdminModule } from './modules/admin/admin.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { EventsModule } from './modules/events/events.module';
import { BenefitsModule } from './modules/benefits/benefits.module';
import { CommunityModule } from './modules/community/community.module';
import { ContactModule } from './modules/contact/contact.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { HealthModule } from './modules/health/health.module';
import { CronModule } from './modules/cron/cron.module';
import { validate } from './config/env.validation';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate,
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per ttl
      },
    ]),

    // Task scheduling
    ScheduleModule.forRoot(),

    // Core modules
    DatabaseModule,
    RedisModule,

    // Feature modules
    UsersModule,
    AdminModule,
    MembershipsModule,
    EventsModule,
    BenefitsModule,
    CommunityModule,
    ContactModule,
    WebhooksModule,
    UploadsModule,
    HealthModule,
    CronModule,
  ],
})
export class AppModule {}
