import { Module } from '@nestjs/common';
import { NotificationModule } from '../../utils/notification/notification.module';
import { UserModule } from '../user/user.module';
import { ObserverController } from './observer.controller';
import { ObserverService } from './observer.service';
import { UserSubscriber } from './subscribers/user.subscriber';
import { NotificationSubscriber } from './subscribers/notification.subscriber';
import { CacheManagerModule } from './../cache-manager/cache-manager.module';
import { MarketPlaceModule } from '../../modules/marketplace/marketplace.module';

@Module({
  imports: [UserModule, CacheManagerModule, NotificationModule, MarketPlaceModule],
  controllers: [ObserverController],
  providers: [ObserverService, UserSubscriber, NotificationSubscriber],
})
export class ObserverModule { }
