import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { UsersService } from '../../user/user.service';
import { Connection, EntitySubscriberInterface, InsertEvent } from 'typeorm';
import { User } from '../../user/user.entity';
import { MarketplaceService } from '../../../modules/marketplace/marketplace.service';

@Injectable()
export class UserSubscriber implements EntitySubscriberInterface<User> {
  constructor(
    @InjectConnection() readonly connection: Connection,
    private readonly userService: UsersService,
    private readonly marketplaceService: MarketplaceService,
  ) {
    connection.subscribers.push(this);
  }

  public listenTo(): any {
    return User;
  }

  /**
   * Initialiaze after User insert event
   *
   * @param event
   * @returns
   */
  public async afterInsert(event: InsertEvent<User>): Promise<any> {
    await event.queryRunner.commitTransaction();
    await event.queryRunner.startTransaction();
    await this.userService.initializeWallet(event.entity);
    await this.marketplaceService.initializeCart(event.entity)
    await this.userService.initializeAvatar(event.entity);
    await this.userService.initializeNotificationSetting(event.entity);
    await this.userService.initializeUserSessionInfo(event.entity);
    await this.userService.initializeUserRespectReward(event.entity);
    return;
  }
}
