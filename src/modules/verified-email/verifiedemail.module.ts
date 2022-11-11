import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '../../utils/logger/logger.module';
import { MailModule } from '../../utils/mailer/mail.module';
import { VerifiedEmail } from './verifiedemail.entity';
import { VerifiedEmailService } from './verifiedemail.service';

@Module({
  imports: [
    LoggerModule,
    MailModule,
    TypeOrmModule.forFeature([VerifiedEmail]),
  ],
  controllers: [],
  exports: [VerifiedEmailService],
  providers: [VerifiedEmailService],
})
export class VerifiedEmailModule {}
