import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './config/database/database.module';
import { RedisModule as ConfigRedisModule } from './config/redis/redis.module';
import { RedisModule } from './modules/redis/redis.module';
import { QueueModule } from './modules/queue/queue.module';
import { AuditModule } from './modules/audit/audit.module';
import { TwoFactorModule } from './modules/two-factor/two-factor.module';
import { DeviceModule } from './modules/devices/device.module';
import { SecurityModule } from './modules/security/security.module';
import { AuthModule } from './modules/auth/auth.module';
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
    ConfigRedisModule,
    RedisModule,
    QueueModule,
    AuditModule,

    // Security modules
    TwoFactorModule,
    DeviceModule,
    SecurityModule,

    // Feature modules
    AuthModule,
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
