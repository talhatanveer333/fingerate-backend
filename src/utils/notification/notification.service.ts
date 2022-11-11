import { Injectable, HttpException } from '@nestjs/common';
import { UsersService } from '../../modules/user/user.service';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { NotificationType } from '../../utils/notification/common/index.enums';
import { UserNotification } from '../../modules/user/notification.entity';
import { User } from '../../modules/user/user.entity';
import { LoggerService } from '../logger/logger.service';
import { initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import * as firebase from 'firebase-admin';

@Injectable()
export class NotificationService {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(UserNotification)
    private readonly userNotificationRepository: Repository<UserNotification>,
    private readonly loggerService: LoggerService,
  ) {
    initializeApp({
      credential: firebase.credential.applicationDefault(),
    });
  }

  /**
   * Save Users Notifications
   *
   * @param users
   * @param survey
   */
  public async saveUserNotifications(
    user: User,
    type: NotificationType,
    title: string,
    body: string,
  ) {
    const notification = new UserNotification();
    notification.type = type;
    notification.title = title;
    if (
      type === NotificationType.SURVEY_GOES_LIVE &&
      !user.notificationSetting.surveyGoesLive
    ) {
      notification.isSettled = true;
    }
    notification.body = body;
    notification.user = user;
    return await this.userNotificationRepository.save(notification);
  }

  /**
   * send push notification
   *
   * @param user
   * @param
   */
  public async sendPushNotification(
    notification: UserNotification,
    surveyId?: string,
  ) {
    const notificationUser = await this.getUserByNotification(notification);
    if (!notification.isSettled) {
      let message = {};
      message = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: {
          type: notification.type,
          title: notification.title,
          body: notification.body,
          surveyId: surveyId ? surveyId : '',
        },
        token: notificationUser.user.sessionInfo.fcmToken,
      };
      await this.sendMessage(message);
      await this.updateIsSettled(notification.uuid);
    }
    return;
  }

  /**
   * update IsSettled
   *
   * @param uuid
   * @returns
   */
  public async updateIsSettled(uuid: string) {
    return await this.userNotificationRepository.update(
      { uuid },
      { isSettled: true },
    );
  }

  public async sendMessage(message) {
    getMessaging()
      .send(message)
      .then((response) => {
        this.loggerService.log('Successfully sent message:', response);
      })
      .catch((error) => {
        this.loggerService.log('Error sending message:', error);
      });
  }

  /**
   * Save Users Notifications
   *
   * @param users
   * @param survey
   */
  public async saveNotifications(
    users: User[],
    type: NotificationType,
    title: string,
    body: string,
    queryRunner: QueryRunner,
    isSettled = false,
  ) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        for (const user of users) {
          const notification = new UserNotification();
          (notification.type = type), (notification.body = body);
          notification.title = title;
          notification.user = user;
          notification.isSettled = isSettled;
          if (
            type === NotificationType.REWARD &&
            !user.notificationSetting.participation
          ) {
            notification.isSettled = true;
          }
          if (
            type === NotificationType.SURVEY_RESULT_SENT &&
            !user.notificationSetting.surveyRequest
          ) {
            notification.isSettled = true;
          }

          await queryRunner.manager.save(notification);
        }
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get User By Notification
   *
   * @param notification
   * @returns
   */
  public async getUserByNotification(notification: UserNotification) {
    return await this.userNotificationRepository.findOne({
      where: {
        uuid: notification.uuid,
      },
      relations: [
        'user',
        'user.wallet',
        'user.sessionInfo',
        'user.notificationSetting',
      ],
    });
  }
}
