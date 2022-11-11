import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { S3Module } from '../../utils/s3/s3.module';
import { MediaModule } from '../../modules/media/media.module';
import { UserModule } from '../../modules/user';
import { LoggerModule } from '../../utils/logger/logger.module';
import { CustomerServiceController } from './customerservice.controller';
import { CustomerService } from './customerservice.service';
import { Inquiry } from './inquiry.entity';
import { InquiryAttachment } from './inquiryattachment.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([Inquiry, InquiryAttachment]),
    LoggerModule,
    MediaModule,
    UserModule,
    S3Module,
  ],
  controllers: [CustomerServiceController],
  exports: [CustomerService],
  providers: [CustomerService],
})
export class CustomerServiceModule {}
