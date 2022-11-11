import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './../auth';
import { CommonModule } from './../common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
import { SurveyModule } from '../../modules/survey/survey.module';
import { SotModule } from '../../modules/sot/sot.module';
import { MediaModule } from '../media/media.module';
import { PaymentModule } from '../payment/payment.module';
import { BullModule } from '@nestjs/bull';
import { MainModule } from '../admin/main.module';
import { WorkerModule } from '../../modules/worker/worker.module';
import { FaqModule } from '../faq/faq.module';
import { ObserverModule } from '../observers/observer.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CustomerServiceModule } from '../customerservice/customerservice.module';
import { NotificationModule } from '../../utils/notification/notification.module';
import { EventModule } from '../../modules/event/event.module';
import { MarketPlaceModule } from './../../modules/marketplace/marketplace.module';
import { WishlistModule } from '../../modules/itemwishlist/itemwishlist.module';
import { NoticeModule } from '../notice/notice.module';
import { EventBannerModule } from '../eventbanner/eventbanner.module';
import { AvatarBannerModule } from './../../modules/avatarbanner/avatarbanner.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [AppService.envConfiguration()],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async () => {
        return await AppService.createConnection();
      },
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    MainModule,
    AuthModule,
    CommonModule,
    SurveyModule,
    PaymentModule,
    SotModule,
    CustomerServiceModule,
    MediaModule,
    NotificationModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    WorkerModule,
    EventModule,
    FaqModule,
    ObserverModule,
    MarketPlaceModule,
    WishlistModule,
    NoticeModule,
    EventBannerModule,
    AvatarBannerModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
