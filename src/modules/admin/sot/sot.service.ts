import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import { getManager, Repository } from 'typeorm';
import { SotListDTO, SotStatisticsSDTO } from './commons/sot.dto';
import { Sot } from './../../sot/sot.entity';
import { ISotStatisticsFilters } from './commons/sot.type';
import moment from 'moment';
import { ResponseCode, ResponseMessage } from '../../../utils/enum';

@Injectable()
export class SotService {
  constructor(
    @InjectRepository(Sot)
    private readonly sotRepository: Repository<Sot>,
  ) { }

  /**
   * Get list of sots
   *
   * @param query
   * @param paginationOption
   * @returns
   */
  public async getSotsList(
    query: SotListDTO,
    paginationOption: IPaginationOptions,
  ) {
    let filter = '';
    if (query?.field_name?.length && query?.value?.length) {
      filter = `AND "${query.field_name}" = '${query.value}' `;
      if (query.field_name === 'name')
        filter = `AND "${query.field_name}" ILIKE '%${query.value}%' `;
    }

    const sql = `SELECT
           S.uuid,
           S.name,
           concat(S."city", ' ', S."country") AS address,
           S."uniqueId",
           S."createdAt",
           S.owner
        FROM 
           sots S
        WHERE
           1=1 ${filter}
           ORDER BY S."createdAt" DESC
           LIMIT $1 OFFSET $2`;

    const sots = await getManager().query(sql, [
      paginationOption.limit,
      Number(paginationOption.limit) * (Number(paginationOption.page) - 1),
    ]);

    const count_sql = `SELECT
            CAST(COUNT(*) AS INTEGER) AS total_count
        FROM 
           sots S
        WHERE
           1=1 ${filter}`;
    const meta = await getManager().query(count_sql);

    return { sots, meta: meta[0] };
  }

  public async getSotById(sotId: string): Promise<Sot> {
    const sql = `SELECT
          S.name,
          concat(S."city", ' ', S."country") AS address,
          S."uniqueId",
          S."createdAt",
          S.owner
        FROM 
          sots S
        WHERE
          S.uuid = '${sotId}'`;
    const sot = await getManager().query(sql);
    if (!sot?.[0])
      throw new HttpException(
        {
          statusCode: ResponseCode.SOT_DOES_NOT_EXISTS,
          message: ResponseMessage.SOT_NOT_EXIST,
        },
        ResponseCode.BAD_REQUEST,
      );

    return sot[0] as Sot;
  }

  /**
   * Get Sot Statistics
   *
   * @params queryOptions
   * @returns totalSots, sotGraphData
   */
  public async getSotStatistics(queryOptions: SotStatisticsSDTO) {
    const totalSots = await this.sotRepository.count();
    const format: ISotStatisticsFilters = {
      endDate: `'${moment.unix(+queryOptions.end_date).format('YYYY-MM-DD')}'`,
      startDate: `'${moment.unix(+queryOptions.start_date).format('YYYY-MM-DD')}'`
    };
    const filter = Object.values(format).join(',');
    const sql = `
    SELECT
    EXTRACT('year' FROM d) AS sot_year,
    CAST(EXTRACT('month' FROM d) AS INTEGER) AS sot_month,
    CAST((SELECT count(*) FROM sots WHERE to_timestamp(sots."createdAt") < d) AS INTEGER) AS no_sots
FROM
    GENERATE_SERIES(
      ${filter},
        interval '-1 month'
    ) AS d
    `;
    const sotGraphData = await getManager().query(sql);
    return {
      totalSot: totalSots,
      sotGraphData,
    };
  }
}
