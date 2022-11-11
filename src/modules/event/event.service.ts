import { HttpException, Injectable } from '@nestjs/common';
import { ResponseCode, ResponseMessage } from '../../utils/enum';
import dayjs from 'dayjs';
import { User } from '../../modules/user/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EventAttendance } from './eventattendance.entity';
import { getConnection, MoreThan, QueryRunner, Repository } from 'typeorm';
import {
  AttendanceStreakReward,
  EventType,
  ParticipationStreakReward,
  StreakSize,
} from './common/event.enums';
import { Reward } from '../../modules/payment/reward.entity';
import { UserNotification } from '../../modules/user/notification.entity';
import { RewardType } from '../../modules/payment/common/payment.enums';
import { NotificationType } from './../../utils/notification/common/index.enums';
import { MonthlyAttendaceDto } from './common/event.dtos';
import { UsersService } from '../../modules/user/user.service';
import { RespectLevelPolicyPoints } from '../../modules/user/common/user.enums';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(EventAttendance)
    private readonly eventAttendanceRepository: Repository<EventAttendance>,
    private readonly userService: UsersService
  ) { }

  /**
   * Mark User Attendance
   *
   * @param user
   */
  async markAttendance(user: User) {
    try {
      await this.checkAlreadyMarked(user, EventType.ATTENDANCE);
      await this.initAttendance(user, EventType.ATTENDANCE);
      return;
    } catch (e) {
      throw e;
    }
  }

  /**
   * Initiate user attendance transaction
   *
   * @param user
   * @param type:EventType
   * @returns
   */
  public async initAttendance(user: User, type: EventType) {
    return new Promise<void>(async (resolve, reject) => {
      const connection = getConnection();
      const queryRunner = connection.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await this.saveAttendance(user, type, queryRunner);
        const lastDayAttendance = dayjs().subtract(1, 'day').unix();
        const isMarked = await this.checkAttendanceByDate(
          user,
          lastDayAttendance,
          type,
        );
        if (isMarked) {
          type === EventType.ATTENDANCE
            ? (user.attendanceStreak += 1)
            : (user.participationStreak += 1);
          const reward = await this.giveStreakRewardAndRespectPoints(user, type, queryRunner);
          if (reward) {
            await this.saveReward(reward, user, type, queryRunner);
            await this.saveRewardNotification(reward, type, user, queryRunner);
          }
          await this.updateUserStreak(user, type, queryRunner);
        } else {
          type === EventType.ATTENDANCE
            ? (user.attendanceStreak = 1)
            : (user.participationStreak = 1);
          await this.updateUserStreak(user, type, queryRunner);
        }
        await this.giveUnConsecutiveRespectPoints(user, type, queryRunner);
        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        await queryRunner.release();
        reject(err);
      } finally {
        await queryRunner.release();
        resolve();
      }
    });
  }

  /**
   * give UnConsecutive Respect Points
   *
   * @param user
   * @param type:string
   * @param queryRunner: QueryRunner
   * @returns
   */
  async giveUnConsecutiveRespectPoints(user: User, type: string, queryRunner: QueryRunner) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        if (type === EventType.ATTENDANCE) {
          const attendanceExpiry = user.respectPolicy?.tenAttendanceExpiry;
          if (attendanceExpiry < dayjs().unix()) {
            const totalAttendances = await this.eventAttendanceRepository.count({
              type: EventType.ATTENDANCE,
              user: user,
              createdAt: MoreThan(attendanceExpiry ? attendanceExpiry : 0)
            });
            if (Number(totalAttendances + 1) > StreakSize.TEN) {
              user.respectPolicy.tenAttendanceExpiry = dayjs().add(60, 'days').endOf('day').unix();
              await this.updateRespectLevel(
                user,
                RespectLevelPolicyPoints.MORE_THAN_TEN_ATTENDANCE,
                queryRunner
              );
            }
          }
        }
        else {
          const participationExpiry = user.respectPolicy?.tenParticipationExpiry;
          if (participationExpiry < dayjs().unix()) {
            const totalAttendances = await this.eventAttendanceRepository.count({
              type: EventType.PARTICIPATION,
              user: user,
              createdAt: MoreThan(participationExpiry ? participationExpiry : 0)
            });
            if (Number(totalAttendances + 1) > StreakSize.TEN) {
              user.respectPolicy.tenParticipationExpiry = dayjs().add(60, 'days').endOf('day').unix();
              await this.updateRespectLevel(
                user,
                RespectLevelPolicyPoints.MORE_THAN_TEN_PARTICIPATION,
                queryRunner
              );
            }
          }
        }
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * save Reward on base of type of rewards
   *
   * @param rewardAmount: number,
   * @param user: User,
   * @param type: EventType,
   * @param queryRunner: QueryRunner
   * @returns
   */
  async saveReward(
    rewardAmount: number,
    user: User,
    type: EventType,
    queryRunner: QueryRunner,
  ) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const reward = new Reward();
        reward.amount = rewardAmount;
        reward.expiredAt = dayjs().add(3, 'months').unix();
        reward.type =
          type === EventType.ATTENDANCE
            ? RewardType.ATTENDANCE
            : RewardType.DAILY_SURVEY_PARTICIPATION;
        reward.wallet = user.wallet;
        await queryRunner.manager.save(reward);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * save Reward Notification
   *
   * @param amount: number,
   * @param type: EventType,
   * @param user: User,
   * @param queryRunner: QueryRunner
   * @returns
   */
  async saveRewardNotification(
    amount: number,
    type: EventType,
    user: User,
    queryRunner: QueryRunner,
  ) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const notification = new UserNotification();
        notification.body =
          type === EventType.ATTENDANCE
            ? this.getRewardMessage(amount, user.attendanceStreak, type)
            : this.getRewardMessage(amount, user.participationStreak, type);
        notification.isSettled = true;
        notification.title = `Daily ${type} Event`;
        notification.type =
          type === EventType.ATTENDANCE
            ? NotificationType.DAILY_ATTENDANCE
            : NotificationType.DAILY_SURVEY_PARTICIPATION_EVENT;
        notification.user = user;
        await queryRunner.manager.save(notification);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
  * get Reward Message
  *
  * @param amount: number,
  * @param type: EventType,
  * @param user: User,
  * @param queryRunner: QueryRunner
  * @returns message
  */
  private getRewardMessage(amount: number, days: number, type: EventType) {
    return `Congrats! You just earned ${amount} SoM from daily ${type} event for ${days} days!`;
  }

  /**
   * update User Streak
   *
   * @param user: User,
   * @param type:EventType
   * @param queryRunner: QueryRunner
   * @returns
   */
  async updateUserStreak(
    user: User,
    type: EventType,
    queryRunner: QueryRunner,
  ) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        if (
          type === EventType.ATTENDANCE &&
          user.attendanceStreak === StreakSize.HUNDRED
        ) {
          user.attendanceStreak = 0;
        }
        if (
          type === EventType.PARTICIPATION &&
          user.participationStreak === StreakSize.HUNDRED
        ) {
          user.participationStreak = 0;
        }
        await queryRunner.manager.save(user);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * give Streak Reward And Respect Points
   *
   * @param user: User,
   * @param type:EventType
   * @param queryRunner: QueryRunner
   * @returns
   */
  async giveStreakRewardAndRespectPoints(
    user: User,
    type: EventType,
    queryRunner: QueryRunner,
  ) {
    return new Promise<number | null>(async (resolve, reject) => {
      try {
        let reward = null;
        if (type === EventType.ATTENDANCE) {
          switch (user.attendanceStreak) {
            case StreakSize.HUNDRED:
              user.wallet.balance += AttendanceStreakReward.HUNDRED;
              reward = AttendanceStreakReward.HUNDRED;
              await this.updateRespectLevel(
                user,
                RespectLevelPolicyPoints.TEN_CONSECUTIVE_ATTENDANCE,
                queryRunner
              );
              break;
            case StreakSize.NINETY:
              await this.updateRespectLevel(
                user,
                RespectLevelPolicyPoints.THIRTY_CONSECUTIVE_ATTENDANCE,
                queryRunner
              );
              break;
            case StreakSize.SEVENTY:
              await this.updateRespectLevel(
                user,
                RespectLevelPolicyPoints.TEN_CONSECUTIVE_ATTENDANCE,
                queryRunner
              );
              break;
            case StreakSize.SIXTY:
              await this.updateRespectLevel(
                user,
                RespectLevelPolicyPoints.THIRTY_CONSECUTIVE_ATTENDANCE,
                queryRunner
              );
              break;
            case StreakSize.FORTY:
              await this.updateRespectLevel(
                user,
                RespectLevelPolicyPoints.TEN_CONSECUTIVE_ATTENDANCE,
                queryRunner
              );
              break;
            case StreakSize.THIRTY:
              user.wallet.balance += AttendanceStreakReward.THIRTY;
              reward = AttendanceStreakReward.THIRTY;
              await this.updateRespectLevel(
                user,
                RespectLevelPolicyPoints.THIRTY_CONSECUTIVE_ATTENDANCE,
                queryRunner
              );
              break;
            case StreakSize.TEN:
              user.wallet.balance += AttendanceStreakReward.TEN;
              reward = AttendanceStreakReward.TEN;
              await this.updateRespectLevel(
                user,
                RespectLevelPolicyPoints.TEN_CONSECUTIVE_ATTENDANCE,
                queryRunner
              );
              break;
          }
        }
        else if (type === EventType.PARTICIPATION) {
          switch (user.participationStreak) {
            case StreakSize.HUNDRED:
              user.wallet.balance += ParticipationStreakReward.HUNDRED;
              reward = ParticipationStreakReward.HUNDRED;
              await this.updateRespectLevel(
                user,
                RespectLevelPolicyPoints.TEN_CONSECUTIVE_PARTICIPATION,
                queryRunner
              );
              break;
            case StreakSize.NINETY:
              await this.updateRespectLevel(
                user,
                RespectLevelPolicyPoints.THIRTY_CONSECUTIVE_PARTICIPATION,
                queryRunner
              );
              break;
            case StreakSize.SEVENTY:
              await this.updateRespectLevel(
                user,
                RespectLevelPolicyPoints.TEN_CONSECUTIVE_PARTICIPATION,
                queryRunner
              );
              break;
            case StreakSize.SIXTY:
              await this.updateRespectLevel(
                user,
                RespectLevelPolicyPoints.THIRTY_CONSECUTIVE_PARTICIPATION,
                queryRunner
              );
              break;
            case StreakSize.FORTY:
              await this.updateRespectLevel(
                user,
                RespectLevelPolicyPoints.TEN_CONSECUTIVE_PARTICIPATION,
                queryRunner
              );
              break;
            case StreakSize.THIRTY:
              user.wallet.balance += ParticipationStreakReward.THIRTY;
              reward = ParticipationStreakReward.THIRTY;
              await this.updateRespectLevel(
                user,
                RespectLevelPolicyPoints.THIRTY_CONSECUTIVE_PARTICIPATION,
                queryRunner
              );
              break;
            case StreakSize.TEN:
              user.wallet.balance += ParticipationStreakReward.TEN;
              reward = ParticipationStreakReward.TEN;
              await this.updateRespectLevel(
                user,
                RespectLevelPolicyPoints.TEN_CONSECUTIVE_PARTICIPATION,
                queryRunner
              );
              break;
          }
        }
        user.wallet.totalReceived += reward;
        await queryRunner.manager.save(user.wallet);
        resolve(reward);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * update Respect Level
   *
   * @param user: User,
   * @param point:number
   * @param queryRunner: QueryRunner
   * @returns void
   */
  async updateRespectLevel(user: User, points: number, queryRunner: QueryRunner) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        user.respectLevelPoints += points;
        user.respectLevel = this.userService.getUserRespectLevel(user);
        await queryRunner.manager.save(user);
        user.respectPolicy ? await queryRunner.manager.save(user.respectPolicy) : '';
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * save Attendance
   *
   * @param user: User,
   * @param type:EventType
   * @param queryRunner: QueryRunner
   * @returns void
   */
  async saveAttendance(user: User, type: EventType, queryRunner: QueryRunner) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const attendance = new EventAttendance();
        attendance.type = type;
        attendance.user = user;
        await queryRunner.manager.save(attendance);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Check date of attendance of user
   *
   * @param user
   * @param data:number
   * @param type:EventType
   * @returns result
   */
  async checkAttendanceByDate(user: User, date: number, type: EventType) {
    try {
      const startOfDay = dayjs.unix(date).startOf('day').unix();
      const endOfDay = dayjs.unix(date).endOf('day').unix();
      const sql = `
              SELECT *
              FROM
                events_attendances ea
              WHERE
                ea."userId" = '${user.uuid}' AND
                ea."type"='${type}' AND 
                ea."createdAt" BETWEEN ${startOfDay} AND ${endOfDay};
                `;
      const result = await this.eventAttendanceRepository.query(sql);
      if (result.length) {
        return true;
      }
      return false;
    } catch (e) {
      throw e;
    }
  }

  /**
   * Check Lst Day attendance of user
   *
   * @param user
   * @param type:EventType
   * @returns isMarked
   */
  async checkLastDayAttendance(user: User, type: EventType) {
    try {
      const yesterdayDate = dayjs().subtract(1, 'day').unix();
      const isMarked = await this.checkAttendanceByDate(
        user,
        yesterdayDate,
        type,
      );
      return isMarked;
    } catch (e) {
      throw e;
    }
  }

  /**
   * Check If User Has Already Marked Attendance For Specific Event Today
   *
   * @param user
   * @param type:EventType
   * @return isAlreadyMarked
   */
  async checkAlreadyMarked(user: User, type: EventType, throwError = true) {
    const dateToday = dayjs().unix();
    const isAlreadyMarked = await this.checkAttendanceByDate(
      user,
      dateToday,
      type,
    );
    if (isAlreadyMarked && throwError) {
      throw new HttpException(
        {
          statusCode: ResponseCode.ATTENDANCE_ALREADY_MARKED,
          message: ResponseMessage.ATTENDANCE_ALREADY_MARKED,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    return isAlreadyMarked;
  }

  /**
   * get User Monthly Attendance
   *
   * @param user
   * @param monthlyAttendaceDto: MonthlyAttendaceDto 
   * @returns result
   */
  public async getUserMonthlyAttendance(
    user: User,
    monthlyAttendaceDto: MonthlyAttendaceDto,
  ): Promise<any> {
    try {
      const fromDate = dayjs
        .unix(monthlyAttendaceDto.date)
        .startOf('month')
        .unix();
      const toDates = dayjs
        .unix(monthlyAttendaceDto.date)
        .endOf('month')
        .unix();
      const sql = `SELECT 
      e."uuid" as "attendaceId",
      to_timestamp(e."createdAt")::date as date
      FROM 
        events_attendances  e
      WHERE e."createdAt" BETWEEN ${fromDate} AND ${toDates}  
        AND e."userId"=$1
        `;
      const result = await this.eventAttendanceRepository.query(sql, [
        user.uuid,
      ]);
      return result;
    } catch (e) {
      throw e;
    }
  }
}
