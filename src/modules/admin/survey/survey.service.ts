import { HttpException, Injectable } from '@nestjs/common';
import bigDecimal from 'js-big-decimal';
import { IOptionResult } from '../../survey/common/survey.interface';
import { SurveyService } from './../../../modules/survey/survey.service';
import { getManager, Repository, ILike } from 'typeorm';
import { S3Service } from '../../../utils/s3/s3.service';
import { ResponseCode, ResponseMessage } from './../../../utils/enum';
import { SurveyOptionChartDto } from '../../survey/common/survey.dtos';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import {
  ManagedSurveyListDTO,
  RegisterSurveyFromAdminDTO,
  SurveyListDTO,
} from './commons/survey.dto';
import { IManageSurveyListFilters, ISurveyListFilters } from './commons/survey.types';
import { UsersService } from '../../user/user.service';
import { User } from '../../user/user.entity';
import { Admin } from '../admin/admin.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { SilverBellRequest } from '../../survey/silverbellrequest.entity';

@Injectable()
export class AdminSurveyService {
  constructor(
    @InjectRepository(SilverBellRequest)
    private readonly silverBellRepo: Repository<SilverBellRequest>,
    private readonly s3Service: S3Service,
    private readonly customerSurveyService: SurveyService,
    private readonly usersService: UsersService,
  ) { }



  /**
   * 
   * @param uuid 
   * @param sattus 
   */
  public async manageSurveyChangeStatus(uuid: string, status: string) {
    const silverBellSurvey = await this.silverBellRepo.findOne({
      where: {
        uuid
      }
    });
    if (!silverBellSurvey) {
      throw new HttpException({
        statusCode: ResponseCode.SILVERBELL_SURVEY_NOT_EXISTS,
        message: ResponseMessage.SILVERBELL_SURVEY_NOT_EXISTS,
      },
        ResponseCode.BAD_REQUEST)
    }
    silverBellSurvey.status = status;
    await this.silverBellRepo.save(silverBellSurvey);
  }

  /**
   * 
   * @param uuid 
   * @returns 
   */
  public async getManageSurveyById(uuid: string) {
    const silverBellSurvey = await this.silverBellRepo.findOne({
      where: { uuid },
      select: ['createdAt', 'applicantName', 'applicantCompany', 'applicantEmail', 'applicantPhoneNumber', 'status']
    })
    if (!silverBellSurvey) {
      throw new HttpException({
        statusCode: ResponseCode.SILVERBELL_SURVEY_NOT_EXISTS,
        message: ResponseMessage.SILVERBELL_SURVEY_NOT_EXISTS,
      },
        ResponseCode.BAD_REQUEST)
    }
    return silverBellSurvey;
  }

  /**
   * 
   * @param queryOptions 
   * @param pagination 
   * @returns 
   */
  public async getManageSurveyList(queryOptions: ManagedSurveyListDTO, pagination: IPaginationOptions) {
    const limit = Number(pagination.limit);
    const page = Number(pagination.page);
    const result = await this.silverBellRepo.findAndCount({
      where: {
        applicantEmail: ILike(`%${queryOptions.email || ''}%`),
        applicantCompany: ILike(`%${queryOptions.company || ''}%`),
        applicantPhoneNumber: ILike(`%${queryOptions.phoneNumber || ''}%`),
        status: ILike(`%${queryOptions.status || ''}%`)
      },
      take: limit,
      skip: limit * (page - 1)
    })
    return {
      records: result[0],
      meta: {
        totalCount: result[1]
      }
    };
  }

  /**
   * get total participation chart  SurveyId
   *
   * @returns
   * @param uuid
   */
  public async getSurveyChartByOption(uuid: string) {
    try {
      await this.customerSurveyService.getSurveyById(uuid);
      const sql = `SELECT
      so."uuid" as "OptionId",
      so."name" as "OptionName",
      so."colour" as "OptionColour",
      CAST(count(sp."OptionId") AS INTEGER) as "OptionCount"
      FROM surveys_participants sp
      INNER JOIN survey_options so ON so."uuid" = sp."OptionId"
      RIGHT JOIN surveys s ON s."uuid" = so."surveyId"
      WHERE s."uuid" = $1
      GROUP BY so."uuid"
        `;
      const optionResult: IOptionResult[] = await getManager().query(sql, [
        uuid,
      ]);
      if (!optionResult.length) {
        return [];
      }
      const totalCount = optionResult
        .map((val) => val.OptionCount)
        .reduce((curr, acc) => {
          return curr + acc;
        });
      const optionPercentage = [];
      const options = await this.optionsBySurveyId(uuid);
      options.map(async (current) => {
        const index = optionResult.findIndex(
          (x) => x.OptionId === current.uuid,
        );
        if (index >= 0) {
          optionPercentage.push({
            optionId: optionResult[index].OptionId,
            optionName: optionResult[index].OptionName,
            optionColour: optionResult[index].OptionColour,
            percentage: Number(
              new bigDecimal(optionResult[index].OptionCount)
                .divide(new bigDecimal(totalCount), 4)
                .multiply(new bigDecimal(100))
                .getValue(),
            ),
          });
        } else {
          optionPercentage.push({
            optionId: current.uuid,
            optionName: current.name,
            optionColour: current.colour,
            percentage: 0,
          });
        }
      });
      return { totalCount, optionPercentage };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get Survey Options By Id
   *
   * @param surveyId
   * @returns
   */

  public async optionsBySurveyId(surveyId: string) {
    const sql = `SELECT 
          so."uuid",
          so."name",
          so."description",
          so."colour"
        FROM 
          survey_options so  
        WHERE so."surveyId"=$1`;

    return await getManager().query(sql, [surveyId]);
  }

  /**
   * returns the survey list according to the queryOptions
   *
   * @param pagination
   * @param queryOptions
   * @returns
   */
  public async getSurveyList(
    pagination: IPaginationOptions,
    queryOptions: SurveyListDTO,
  ) {
    const format: ISurveyListFilters = {
      title: queryOptions.title
        ? `AND S."question" ILIKE '%${queryOptions.title}%'`
        : '',
      sotName: queryOptions.sot_name
        ? `AND sots."name" ILIKE '%${queryOptions.sot_name}%'`
        : '',
      type: queryOptions.type
        ? `AND S."type" ILIKE '%${queryOptions.type}%'`
        : '',
      sotGrade: queryOptions.sot_grade
        ? `AND sots."grade" ILIKE '%${queryOptions.sot_grade}%'`
        : '',
      surveyStatus: queryOptions.survey_status
        ? `AND S."status" ILIKE '%${queryOptions.survey_status}%'`
        : '',
    };
    const limit = Number(pagination.limit);
    const page = Number(pagination.page);

    let paginationSQL = 'SELECT COUNT(*) as count ';
    let sql = `
    SELECT 
        q3."uuid",
        TO_CHAR(TO_TIMESTAMP(q3."createdAt"), 'DD/MM/YYYY') AS creation_date,
        q3."question" AS title,
        q3."email",
        q3."participants",
        q3."rewardAmount" AS reward_som,
        q3."type" AS survey_type,
        TO_CHAR(TO_TIMESTAMP(q3."startingDate"), 'DD/MM/YYYY') AS starting_date,
        TO_CHAR(TO_TIMESTAMP(q3."endingDate"), 'DD/MM/YYYY') AS ending_date
    `;
    const commonSQL = `FROM sots_surveys AS SS
    INNER JOIN
        (SELECT q1.*, COALESCE(q2."participants", 0) AS participants
        FROM
            (SELECT 
                S.*
            FROM
                surveys as S
            WHERE
                 1=1
                 ${format.title}
                 ${format.type}
                 ${format.surveyStatus}
            ) AS q1
        LEFT JOIN
        (
            SELECT 
                SP."surveyId",
                COUNT(*) as participants
            FROM
                surveys_participants AS SP
            GROUP BY
                SP."surveyId"
        ) AS q2
        ON q1."uuid" = q2."surveyId"
    ) AS q3
    ON q3."uuid" = SS."surveyId"
    LEFT JOIN sots ON sots."uuid" = SS."sotId"
    WHERE
        1=1
        ${format.sotName}
        ${format.sotGrade}
    `;
    paginationSQL += commonSQL;
    sql += ` ${commonSQL}
            ORDER BY q3."createdAt" DESC
            LIMIT $1 OFFSET $2 `;

    const results = await getManager().query(sql, [limit, limit * (page - 1)]);
    const count = await getManager().query(paginationSQL);
    return { surveys: results, meta: { total_count: count[0].count } };
  }

  /**
   *
   * @returns the filter data
   */
  public async getFilterData() {
    const sql = `
    SELECT 
        ARRAY_AGG(DISTINCT S."grade") AS sots_grades
    FROM
        sots AS S
    `;
    const { sots_grades: sotsGrades } = (await getManager().query(sql))[0];
    return { sotsGrades };
  }

  /**
   * Get survey by Id
   *
   * @returns survey
   * @param uuid
   */
  public async getSurveyById(uuid: string) {
    const sql = `
        SELECT
            s."uuid" as "surveyId",
            s."createdAt",
            s."question" as title,
            s."rewardAmount",
            s."type",
            s."startingDate",
            s."endingDate",
            s."status",
            CAST((SELECT COUNT(*) FROM surveys_participants sp WHERE sp."surveyId" = s."uuid") AS INT) AS "participationCount",
            json_agg(json_build_object('option_id', so."uuid", 'option', so."name", 'description', so."description", 'image', so."image")) "options",
        (SELECT 
          json_agg(json_build_object('sot_id', sot.uuid, 'sot_name', sot."name", 'address', concat(sot."city", ' ', sot."country"))) "sots"
          FROM sots_surveys ss 
          INNER JOIN sots AS sot ON sot."uuid" = ss."sotId"
          WHERE ss."surveyId" = s."uuid"
          ) AS sots
          FROM surveys s 
          INNER JOIN survey_options so ON so."surveyId" = s."uuid"
          WHERE s."uuid" = '${uuid}'
          GROUP By s."uuid"`;
    const survey = await getManager().query(sql);
    if (!survey.length) {
      throw new HttpException(
        {
          statusCode: ResponseCode.INVALID_SURVEY_ID,
          message: ResponseMessage.SURVEY_NOT_EXIST,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    survey[0].options.map((o) => {
      o.image = o.image ? this.s3Service.getSignedURL(o.image) : null;
    });
    return survey[0];
  }

  /*
   * Get Gender Statistics By SurveyId
   * @param survey uuid
   * @returns
   */
  public async genderStatisticsBySurveyId(uuid: string) {
    await this.customerSurveyService.getSurveyById(uuid);
    return await this.customerSurveyService.genderChartBySurveyId(uuid);
  }

  /*
   * Get Age Statistics By SurveyId
   * @param survey uuid
   * @returns
   */
  public async ageStatisticsBySurveyId(uuid: string) {
    await this.customerSurveyService.getSurveyById(uuid);
    return await this.customerSurveyService.ageChartBySurveyId(uuid);
  }

  /*
   * Get option gender statistics by surveyId
   * @param query surveyId, optionId
   * @returns
   */
  public async optionGenderStatisticsBySurveyId(query: SurveyOptionChartDto) {
    await this.customerSurveyService.getSurveyById(query.surveyId);
    await this.customerSurveyService.getSurveyOptionById(query.surveyId, query.optionId);
    return await this.customerSurveyService.optionChartBySurveyId(query);
  }

  /**
   *
   * @param payload
   * @param admin
   * @returns
   */
  public async registerSurvey(
    payload: RegisterSurveyFromAdminDTO,
    admin: Admin,
  ) {
    const user: User = payload.userId
      ? await this.usersService.get(payload.userId)
      : null;
    return await this.customerSurveyService.registerSurvey(
      payload,
      user,
      admin,
    );
  }
}
