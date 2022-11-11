import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getManager, Repository } from 'typeorm';
import { ResponseCode, ResponseMessage } from '../../../utils/enum';
import * as moment from 'moment';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import { IUserListFilters } from '../admin/commons/user.types';
import { UserListDTO } from '../admin/commons/user.dto';
import { UserGraphStatDTO, UserStatusUpdateDTO } from './commons/user.dto';
import {
  IGraphDataReturnObject,
  IGraphStatsFilters,
} from './commons/user.types';
import { User } from '../../../modules/user/user.entity';
import { UsersService } from '../../../modules/user/user.service';
import { UserStatusEnum } from '../../auth/common/auth.enums';
import {
  PaymentStatus,
  PaymentType,
} from './../../../modules/payment/common/payment.enums';

@Injectable()
export class AdminUserService {
  constructor(
    private readonly userService: UsersService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) { }

  /**
   *
   * @param user
   * @returns
   */
  public async getUserRecommender(user: User) {
    return await this.userRepo.findOne({
      where: {
        referralCode: user.referredBy,
      },
    });
  }

  /**
   *
   * @param queryOptions
   * @param paginationOption
   * @returns
   */
  public async getUsersList(
    queryOptions: UserListDTO,
    paginationOption: IPaginationOptions,
  ) {
    const format: IUserListFilters = {
      email: queryOptions.email ? ` AND email = '${queryOptions.email}'` : '',
      status: queryOptions.status
        ? ` AND "status" = '${queryOptions.status}'`
        : '',
      nickName: queryOptions.nick_name
        ? ` AND "nickName" LIKE '%${queryOptions.nick_name}%'`
        : '',
      startDate: queryOptions.start_date
        ? ` AND u."createdAt" >= ${moment
          .unix(queryOptions.start_date)
          .startOf('day')
          .unix()}`
        : '',
      endDate: queryOptions.end_date
        ? ` AND u."createdAt" <= ${moment
          .unix(queryOptions.end_date)
          .endOf('day')
          .unix()}`
        : '',
    };
    const filter = Object.values(format).join('');
    const sql = `SELECT 
              U."uuid",
              U."nickName",
              U."email",
              U."status",
              U."createdAt",
              COALESCE(UW."balance", 0) AS balance,
              COALESCE(X.survey_requests, 0) survey_requests,
              U."respectLevel" AS respect_level,
              COALESCE(R.referrals, 0) referrals
            FROM 
              users U
            INNER JOIN users_wallets UW ON UW."uuid" = U."walletId"
            LEFT JOIN (
                SELECT
                  S."initiatorId",
                  CAST(COUNT(*) as INTEGER) AS survey_requests
                FROM 
                  surveys S
                GROUP BY S."initiatorId"
            ) as X  ON X."initiatorId" = U."uuid"          
            LEFT JOIN (
                SELECT
                  "referredBy",
                  CAST(COUNT(*) as INTEGER) AS referrals
                FROM 
                  users
                GROUP BY "referredBy"
            ) as R  ON R."referredBy" = U."referralCode"
          WHERE 
          1=1 ${filter} ORDER BY "createdAt" DESC 
          LIMIT $1 OFFSET $2`;
    const users = await getManager().query(sql, [
      paginationOption.limit,
      Number(paginationOption.limit) * (Number(paginationOption.page) - 1),
    ]);

    const count_sql = `SELECT 
                CAST(COUNT(*) as INTEGER) as total_count
              FROM 
                users U
              INNER JOIN users_wallets UW ON UW."uuid" = U."walletId"
              WHERE 
                1=1 ${filter}  `;
    const meta = await getManager().query(count_sql);
    return { users, meta: meta[0] };
  }

  /**
   * returns the user details
   *
   * @returns a single user
   * @param uuid
   */
  public async getById(uuid: string) {
    const sql = `
    SELECT 
      U."uuid", 
      U."email", 
      U."nickName", 
      U."createdAt", 
      U."country",
      U."status",
      U."referralCode",
      U."respectLevel",
      COALESCE(UD."deviceInfo", '{}') as device_info,
      COALESCE(UW."balance", 0) AS balance,
      COALESCE(X.survey_requests, 0) survey_requests
    FROM 
      "users" as U
    INNER JOIN users_wallets UW ON UW."uuid" = U."walletId"
    LEFT JOIN user_session_infos UD ON UD."uuid" = U."sessionId"
    LEFT JOIN (
                SELECT
                  S."initiatorId",
                  CAST(COUNT(*) as INTEGER) AS survey_requests
                FROM 
                  surveys S
                GROUP BY S."initiatorId"
            ) as X  ON X."initiatorId" = U."uuid"
            
    WHERE 
      U."uuid" = '${uuid}'`;
    const result = await getManager().query(sql);
    if (!result.length)
      throw new HttpException(
        {
          message: ResponseMessage.USER_DOES_NOT_EXISTS,
          statusCode: ResponseCode.USER_DOES_NOT_EXISTS,
        },
        ResponseCode.BAD_REQUEST,
      );

    const user = result[0];
    const lastDisabled = await getManager().query(
      `
      SELECT * FROM "user_status_history" WHERE "userUuid" = $1 AND "status" = $2 ORDER BY "createdAt" DESC LIMIT 1
    `,
      [user.uuid, UserStatusEnum.DISABLED],
    );
    const lastTerminated = await getManager().query(
      `
      SELECT * FROM "user_status_history" WHERE "userUuid" = $1 AND "status" = $2 ORDER BY "createdAt" DESC LIMIT 1
    `,
      [user.uuid, UserStatusEnum.TERMINATED],
    );
    user.device_info = JSON.parse(user.device_info);
    user.lastDisabled = lastDisabled?.[0]?.createdAt;
    user.lastTerminated = lastTerminated?.[0]?.createdAt;

    return user;
  }
  /**
   * gets the memberships based on filter
   *
   * @param startDate
   * @param endDate
   * @param withdrawnFilter
   * @returns
   */
  async getMemberShips(
    startDate: string,
    endDate: string,
    withdrawnFilter?: string,
  ) {
    const sql = `
      SELECT 
        q1.date,
        CAST(COUNT(q2.userDate) AS INTEGER) AS users
      FROM
        (
          SELECT 
          to_char(generate_series(DATE_TRUNC('month',to_timestamp(${+startDate}::numeric)),
          DATE_TRUNC('month',to_timestamp(${+endDate}::numeric)), '1 month'::interval),'MM/YYYY') 
          AS date
        ) AS q1	
      LEFT JOIN
        (
          SELECT
            ${withdrawnFilter?.length
        ? "to_char(to_timestamp(U.\"withdrawExpiry\") - INTERVAL '6 MONTH','MM/YYYY')"
        : 'to_char(to_timestamp(U."createdAt"),\'MM/YYYY\')'
      } as userDate
          FROM 
            USERS AS U
          WHERE 
            1=1
            ${withdrawnFilter || ''}
        )  AS q2 
      ON (q1.date = q2.userDate)
      GROUP BY
        q2.userDate, q1.date
      ORDER BY
        TO_DATE(q1.date,'MM/YYYY');
    `;
    return await getManager().query(sql);
  }

  /**
   * gets the subscribers
   *
   * @param filter
   * @returns
   */
  async getSubscribers(filter?: string) {
    const sql = `
    SELECT 
      COUNT(*) as subscribers
    FROM 
      USERS AS U
    WHERE 
      1=1  ${filter ? filter : ''}
    `;
    return await getManager().query(sql);
  }

  /**
   *
   * @param queryOptions
   * @returns graphDataReturnObject
   */
  public async getGraphStats(queryOptions: UserGraphStatDTO) {
    const format: IGraphStatsFilters = {
      startDate: ` AND U."createdAt" >= ${queryOptions.start_date}`,
      endDate: ` AND U."createdAt" <= ${queryOptions.end_date}`,
    };
    const filter = Object.values(format).join('');
    const withdrawnFilter = ' AND U."withdrawExpiry" IS NOT NULL';
    const memberShipWithdrawlsArray = await this.getMemberShips(
      queryOptions.start_date,
      queryOptions.end_date,
      withdrawnFilter,
    );
    const activeMembers = await this.getMemberShips(
      queryOptions.start_date,
      queryOptions.end_date,
    );
    const { subscribers: totalSubscribers } = (await this.getSubscribers())[0];
    const { subscribers: totalFilteredSubscribers } = (
      await this.getSubscribers(filter)
    )[0];

    const graphDataReturnObject: IGraphDataReturnObject = {
      cumulativeSubscribers: Number(totalSubscribers),
      filteredCumulativeSubscribers: Number(totalFilteredSubscribers),
      memberShipWithdrawls: memberShipWithdrawlsArray,
      newMemberShips: activeMembers,
    };
    return graphDataReturnObject;
  }

  /**
   *
   * @param pagination
   * @param uuid
   * @returns
   */
  public async getReferrals(
    pagination: IPaginationOptions,
    uuid: string,
  ): Promise<{ users: User[]; meta: { total_count: number } }> {
    const user = await this.userService.get(uuid);
    if (!user)
      throw new HttpException(
        {
          statusCode: ResponseCode.USER_DOES_NOT_EXISTS,
          message: ResponseMessage.USER_DOES_NOT_EXISTS,
        },
        ResponseCode.BAD_REQUEST,
      );
    const limit = Number(pagination.limit);
    const page = Number(pagination.page);
    const [users, count] = await this.userRepo.findAndCount({
      where: { referredBy: user.referralCode },
      skip: limit * (page - 1),
      take: limit,
      order: { createdAt: 'ASC' },
      select: ['uuid', 'email', 'nickName', 'createdAt'],
    });

    return { users, meta: { total_count: count } };
  }

  /**
   *
   * @param pagination
   * @param uuid
   * @returns
   */
  public async getPurchases(pagination: IPaginationOptions, uuid: string) {
    const user = await this.userService.get(uuid);
    if (!user)
      throw new HttpException(
        {
          statusCode: ResponseCode.USER_DOES_NOT_EXISTS,
          message: ResponseMessage.USER_DOES_NOT_EXISTS,
        },
        ResponseCode.BAD_REQUEST,
      );
    const sql = `SELECT 
              P."createdAt",
              P."amount",
              AI.item_name,
              AI.category
            FROM
              users U
              INNER JOIN users_wallets UW ON UW."uuid" = U."walletId"
              INNER JOIN  users_items_collections UI ON UI."userId" = U."uuid"
              INNER JOIN avatars_items AI ON AI."uuid" = UI."itemId"
              INNER JOIN payments P ON P."walletId" = UW."uuid"
            WHERE
              P.type='${PaymentType.PURCHASE}' 
              AND p."paymentStatus"='${PaymentStatus.COMPLETED}' 
              AND U.uuid=$1 ORDER BY P."createdAt" DESC 
              LIMIT $2 OFFSET $3`;
    const purchases = await getManager().query(sql, [
      uuid,
      pagination.limit,
      Number(pagination.limit) * (Number(pagination.page) - 1),
    ]);
    const count_sql = `SELECT 
                    CAST(COUNT(*) as INTEGER) as total_count
                  FROM
                    users U
                    INNER JOIN users_wallets UW ON UW."uuid" = U."walletId"
                    INNER JOIN  users_items_collections UI ON UI."userId" = U."uuid"
                    INNER JOIN avatars_items AI ON AI."uuid" = UI."itemId"
                    INNER JOIN payments P ON P."walletId" = UW."uuid" 
                  WHERE
                    P.type='${PaymentType.PURCHASE}' 
                    AND p."paymentStatus"='${PaymentStatus.COMPLETED}' 
                    AND U.uuid=$1`;
    const meta = await getManager().query(count_sql, [uuid]);
    return { purchases, meta: meta[0] };
  }

  /**
   * Update user status
   *
   * @param uuid
   * @param payload
   */
  public async updateUserStatus(uuid: string, payload: UserStatusUpdateDTO) {
    const user = await this.userRepo.findOne({ uuid });
    if (!user)
      throw new HttpException(
        {
          statusCode: ResponseCode.USER_DOES_NOT_EXISTS,
          message: ResponseMessage.USER_DOES_NOT_EXISTS,
        },
        ResponseCode.BAD_REQUEST,
      );

    if (user.status === payload.status)
      throw new HttpException(
        {
          statusCode: ResponseCode.USER_STATUS_ALREADY_EXISTS,
          message: ResponseMessage.USER_STATUS_ALREADY_EXISTS,
        },
        ResponseCode.BAD_REQUEST,
      );

    user.status = payload.status;
    await this.userService.save(user);
    if (payload.status !== UserStatusEnum.ACTIVE)
      await this.userService.addUserStatusHistory(
        user,
        payload.status,
        payload.reason,
      );
  }
}
