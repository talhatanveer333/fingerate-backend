import { EventEmitter2 } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import {
  NotificationTitle,
  NotificationType,
} from '../../utils/notification/common/index.enums';
import { MailService } from '../../utils/mailer/mail.service';
import { UsersService } from '../../modules/user/user.service';
import { IRewardDistribution } from '../survey/common/survey.interface';
import { NotificationService } from '../../utils/notification/notification.service';
import { SurveyService } from '../../modules/survey/survey.service';
import { getConnection } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Events } from './common/worker.enums';
import { LoggerService } from '../../utils/logger/logger.service';

@Injectable()
export class EventEmitter {
  constructor(
    private readonly eventEmitter2: EventEmitter2,
    private readonly notificationService: NotificationService,
    private readonly mailService: MailService,
    private readonly userService: UsersService,
    private readonly surveyService: SurveyService,
    private readonly loggerService: LoggerService,
  ) {}

  public emit(eventType: string, event: any) {
    this.eventEmitter2.emit(eventType, event);
    return;
  }

  /**
   * Distribute Reward,Save Reward and Result Out Notifications,Send Mail to Survey Initiator
   *
   * @param surveyId
   * @returns
   */
  @OnEvent(Events.SURVEY_COMPLETED, { async: true })
  public async endSurvey(surveyId: string) {
    this.loggerService.log('Survey End Transaction Started');
    return new Promise<void>(async (resolve, reject) => {
      // get a connection and create a new query runner
      const connection = getConnection();
      const queryRunner = connection.createQueryRunner();
      // establish real database connection using our new query runner
      await queryRunner.connect();
      // lets now open a new transaction:
      await queryRunner.startTransaction();
      try {
        // Distribute Participation Reward
        const { users, survey }: IRewardDistribution =
          await this.surveyService.rewardDistribution(surveyId, queryRunner);
        // Save Reward Notifications
        const rewardTitle = this.rewardTitle(survey.rewardAmount);
        const rewardMessage = this.rewardMessage(survey.rewardAmount);
        await this.notificationService.saveNotifications(
          users,
          NotificationType.REWARD,
          rewardTitle,
          rewardMessage,
          queryRunner,
        );
        // Send Email To Survey Initiator
        await this.mailService.sendSurveyResult(survey);
        // Get Survey Initiator with All Relation
        if (survey.initiator) {
          const surveyInitiator = await this.userService.get(
            survey.initiator.uuid,
          );
          const initiator = [];
          initiator.push(surveyInitiator);
          // Save Survey Result Out Notification
          const resultMessage = await this.resultSendMessage();
          await this.notificationService.saveNotifications(
            initiator,
            NotificationType.SURVEY_RESULT_SENT,
            NotificationTitle.SURVEY_RESULT,
            resultMessage,
            queryRunner,
          );
        }
        await queryRunner.commitTransaction();
      } catch (error) {
        // since we have errors let's rollback changes we made
        await queryRunner.rollbackTransaction();
        await queryRunner.release();
        reject(error);
      } finally {
        await queryRunner.release();
        resolve();
      }
    }).catch((err) => this.loggerService.error('Error', err));
  }

  /**
   * @param rewardAmount
   * @returns
   */
  public rewardMessage(rewardAmount: number) {
    return `Congrats! You just got rewarded with ${rewardAmount} SoM for survey participation`;
  }

  /**
   * @param rewardAmount
   * @returns
   */
  public rewardTitle(rewardAmount: number) {
    return `+ ${rewardAmount} SOM`;
  }

  /**
   * @returns
   */
  public resultSendMessage() {
    return `Your survey results are in! Please check your email`;
  }
}
