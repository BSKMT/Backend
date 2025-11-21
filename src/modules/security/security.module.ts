import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { SecurityService } from './security.service';
import { SecurityController } from './security.controller';
import { GeoLocationService } from './geolocation.service';
import { SecurityEvent, SecurityEventSchema } from './entities/security-event.schema';
import { User, UserSchema } from '../../common/schemas/user.schema';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SecurityEvent.name, schema: SecurityEventSchema },
      { name: User.name, schema: UserSchema },
    ]),
    HttpModule,
    QueueModule,
  ],
  controllers: [SecurityController],
  providers: [SecurityService, GeoLocationService],
  exports: [SecurityService, GeoLocationService],
})
export class SecurityModule {}
