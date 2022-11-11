import { Module } from '@nestjs/common';
import { MediaModule } from '../../../modules/media/media.module';
import { LoggerModule } from '../../../utils/logger/logger.module';
import { AdminCustomerServiceController } from './customerservice.controller';
import { AdminCustomerService } from './customerservice.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inquiry } from '../../customerservice/inquiry.entity';
import { InquiryAttachment } from '../../../modules/customerservice/inquiryattachment.entity';
import { AdminUserModule } from '../user/user.module';
import { UserModule } from '../../../modules/user/user.module';
import { S3Module } from '../../../utils/s3/s3.module';
import { InquiryStatusHistory } from '../../customerservice/inquirystatushistory.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inquiry, InquiryAttachment, InquiryStatusHistory]),
    LoggerModule,
    MediaModule,
    AdminUserModule,
    UserModule,
    S3Module,
  ],
  controllers: [AdminCustomerServiceController],
  providers: [AdminCustomerService],
})
export class AdminCustomerServiceModule { }
