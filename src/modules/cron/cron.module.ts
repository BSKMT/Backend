import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CronController } from './cron.controller';
import { CronService } from './cron.service';
import { User, UserSchema } from '../../common/schemas/user.schema';
import { Event, EventSchema } from '../../common/schemas/event.schema';
import { Membership, MembershipSchema } from '../../common/schemas/membership.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Event.name, schema: EventSchema },
      { name: Membership.name, schema: MembershipSchema },
    ]),
  ],
  controllers: [CronController],
  providers: [CronService],
  exports: [CronService],
})
export class CronModule {}
