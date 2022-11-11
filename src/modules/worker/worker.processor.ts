import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { NotificationService } from '../../utils/notification/notification.service';
import { JobEvents } from '../../modules/sot/common/sot.enums';
import { SurveyStatus } from '../../modules/survey/common/survey.enums';
import { SurveyService } from '../../modules/survey/survey.service';
import { LoggerService } from '../../utils/logger/logger.service';
import { EventEmitter } from './event.emitter';
import { QueueName, QueueJob, Events } from './common/worker.enums';

import {
  NotificationBody,
  NotificationTitle,
  NotificationType,
} from '../../utils/notification/common/index.enums';

@Processor(QueueName.DEFAULT)
export class WorkerProcessor {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly surveyService: SurveyService,
    private eventEmitter: EventEmitter,
    private readonly notificationService: NotificationService,
  ) {
    this.loggerService.setContext('WorkerProcessor');
  }

  /**
   * Survey status update to ongoing job
   *
   * @param job
   * @returns
   */
  @Process(QueueJob.START_SURVEY)
  public startSurvey(job: Job) {
    return new Promise<string>(async (resolve, reject) => {
      try {
        this.loggerService.log(
          `Start Survey Job Started For : ${job.data.surveyId}`,
        );
        await this.surveyService.updateSurveyStatus(
          job.data.surveyId,
          SurveyStatus.ONGOING,
        );
        const survey = await this.surveyService.getSurveyById(
          job.data.surveyId,
        );

        if (!survey.initiator) return resolve(JobEvents.Completed);

        const notification =
          await this.notificationService.saveUserNotifications(
            survey.initiator,
            NotificationType.SURVEY_GOES_LIVE,
            NotificationTitle.SURVEY_GOES_LIVE,
            NotificationBody.SURVEY_GOES_LIVE,
          );
        await this.notificationService.sendPushNotification(
          notification,
          survey.uuid,
        );
        this.loggerService.log(
          `Start Survey Job Ended For : ${job.data.surveyId}`,
        );
        resolve(JobEvents.Completed);
      } catch (err) {
        this.loggerService.error(err);
        reject(err);
      }
    });
  }

  /**
   * Survey status update to ended job
   *
   * @param job
   * @returns
   */
  @Process(QueueJob.END_SURVEY)
  public endSurvey(job: Job) {
    return new Promise<string>(async (resolve, reject) => {
      try {
        this.loggerService.log(
          `End Survey Job Started For : ${job.data.surveyId}`,
        );
        await this.surveyService.updateSurveyStatus(
          job.data.surveyId,
          SurveyStatus.ENDED,
        );
        this.eventEmitter.emit(Events.SURVEY_COMPLETED, job.data.surveyId);
        this.loggerService.log(
          `End Survey Job Ended For : ${job.data.surveyId}`,
        );
        resolve(JobEvents.Completed);
      } catch (err) {
        this.loggerService.error(err);
        reject(err);
      }
    });
  }
}
