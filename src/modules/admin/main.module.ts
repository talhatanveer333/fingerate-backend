import { Module } from '@nestjs/common';
import { AdminUserModule } from './user';
import { AdminModule } from './admin';
import { AuthModule } from './auth';
import { SotModule } from './sot';
import { FaqModule } from './faq/faq.module';
import { AdminPaymentModule } from './payment';
import { AdminSurveyModule } from './survey';
import { MainService } from './main.service';
import { AvatarModule } from './avatar/avatar.module';
import { NoticeModule } from './notice/notice.module';
import { AdminCustomerServiceModule } from './customerservice/customerservice.module';
import { AdminSomModule } from './som/som.module';
import { AdminMediaModule } from './media/media.module';
import { EventBannerModule } from './eventbanner/eventbanner.module';
import { AvatarBannerModule } from './avatarbanner/avatarbanner.module';
import { AdminRechargeModule } from './recharge/recharge.module';
import { AdminRewardModule } from './reward/reward.module';
import { ViewsModule } from './commons/views/views.module';

@Module({
  imports: [
    AdminModule,
    AuthModule,
    AdminUserModule,
    SotModule,
    FaqModule,
    AdminPaymentModule,
    AdminSurveyModule,
    AvatarModule,
    NoticeModule,
    AdminCustomerServiceModule,
    AdminSomModule,
    AdminMediaModule,
    EventBannerModule,
    AvatarBannerModule,
    AdminRewardModule,
    AdminRechargeModule,
    ViewsModule,
  ],
  providers: [MainService],
})
export class MainModule { }
