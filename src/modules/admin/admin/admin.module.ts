import { CacheModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from './../../../utils/mailer/mail.module';
import { LoggerModule } from '../../../utils/logger/logger.module';
import { AdminController } from './admin.controller';
import { Admin } from './admin.entity';
import { AdminService } from './admin.service';
import { AdminLoginHistory } from './admin-login-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, AdminLoginHistory]),
    LoggerModule,
    MailModule,
  ],
  controllers: [AdminController],
  exports: [AdminService],
  providers: [AdminService],
})
export class AdminModule {}
