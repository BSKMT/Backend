import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { ContactMessage, ContactMessageSchema } from '../../common/schemas/contact-message.schema';
import { PQRSDF, PQRSDFSchema } from '../../common/schemas/pqrsdf.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ContactMessage.name, schema: ContactMessageSchema },
      { name: PQRSDF.name, schema: PQRSDFSchema },
    ]),
  ],
  controllers: [ContactController],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactModule {}
