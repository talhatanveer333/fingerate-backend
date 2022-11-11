import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { UsersService } from '../../user/user.service';
import { Connection, EntitySubscriberInterface, InsertEvent } from 'typeorm';
import { CacheManagerService } from '../../../modules/cache-manager/cache-manager.service';
import { UserNotification } from '../../user/notification.entity';
import { NotificationService } from '../../../utils/notification/notification.service';
import { NotificationType } from '../../../utils/notification/common/index.enums';

@Injectable()
export class NotificationSubscriber
  implements EntitySubscriberInterface<UserNotification>
{
  constructor(
    @InjectConnection() readonly connection: Connection,
    private readonly userService: UsersService,
    private readonly cacheManagerService: CacheManagerService,
    private readonly notificationService: NotificationService,
  ) {
    connection.subscribers.push(this);
  }

  public listenTo(): any {
    return UserNotification;
  }

  /**
   * After User  Notification Insert Event
   *
   * @param event
   * @returns
   */
  public async afterInsert(event: InsertEvent<UserNotification>): Promise<any> {
    await event.queryRunner.commitTransaction();
    await event.queryRunner.startTransaction();
    await this.cacheManagerService.setUserUnreadNotificationCount(event.entity);
    if (NotificationType.SURVEY_GOES_LIVE !== event.entity.type) {
      await this.notificationService.sendPushNotification(event.entity);
    }
    return;
  }
}
