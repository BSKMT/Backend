import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { DeviceService } from './device.service';
import { DeviceController } from './device.controller';
import { TrustedDevice, TrustedDeviceSchema } from './entities/trusted-device.schema';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TrustedDevice.name, schema: TrustedDeviceSchema },
    ]),
    HttpModule,
    QueueModule,
  ],
  controllers: [DeviceController],
  providers: [DeviceService],
  exports: [DeviceService],
})
export class DeviceModule {}
