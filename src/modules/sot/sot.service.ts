import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ResponseCode, ResponseMessage } from '../../utils/enum';
import axios from 'axios';
import { Sot } from './sot.entity';
import {
  BlockInfo,
  DistanceKiloMeters,
  EarthInfo,
  MapSotListFilter,
  SotData,
  SotListFilter,
} from './common/sot.enums';
import { SotBlock } from './sot.block.entity';
import { ISot, SotDataInterface } from './common/sot.types';
import { MapSotListQueryDto, SotListQueryDto } from './common/sot.dtos';
import { SurveyStatus } from '../../modules/survey/common/survey.enums';

@Injectable()
export class SotService {
  constructor(
    @InjectRepository(Sot)
    private readonly sotRepository: Repository<Sot>,
    @InjectRepository(SotBlock)
    private readonly sotBlockRepository: Repository<SotBlock>,
  ) {}

  /**
   * Validate Sots To be Add In Survey
   *
   * @param sotsIds
   * @return sots
   */
  async validateSots(sotsIds: string[]): Promise<Sot[]> {
    const uniqueSotIds = [...new Set(sotsIds)];
    const sots = await this.sotRepository.find({
      uuid: In(uniqueSotIds),
    });

    if (sots.length !== uniqueSotIds.length) {
      throw new HttpException(
        {
          statusCode: ResponseCode.INVALID_SOT_ID,
          message: ResponseMessage.INVALID_SOT_ID,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    return sots;
  }

  /**
   * Get Sot By Id
   *
   * @return sots
   */
  async getSotById(uuid: string): Promise<Sot> {
    const sot = await this.sotRepository.findOne({ uuid });
    if (!sot) {
      throw new HttpException(
        {
          statusCode: ResponseCode.INVALID_SOT_ID,
          message: ResponseMessage.INVALID_SOT_ID,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    return sot;
  }

  /**
   * Get Sot Distance From User in Kilometers
   *
   * @param lat1
   * @param lon1
   * @param lat2
   * @param lon2
   * @returns
   */
  async getDistanceFromLatLonInKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    const dLat = this.deg2rad(lat2 - lat1); // deg2rad below
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
      Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = EarthInfo.RADIUS * c; // Distance in km
    return Number(parseFloat(d.toString()).toFixed(1));
  }

  /**
   * Convert Degree to Radian
   *
   * @param deg
   * @returns
   */
  private deg2rad(deg: number) {
    return deg * (Math.PI / 180);
  }

  /**
   * Get Sots List With Distance From user
   *
   * @param sots
   * @param queryDto
   * @returns
   */
  async surveyListWithDistance(sots: any[], queryDto: SotListQueryDto) {
    const responseArray: any[] = [];
    sots.map(async (sot) => {
      const distance = await this.getDistanceFromLatLonInKm(
        Number(queryDto.latitude),
        Number(queryDto.longitude),
        sot.latitude,
        sot.longitude,
      );
      sot.distance = distance;
      if (
        queryDto.filter === SotListFilter.NEAR_BY &&
        distance <= DistanceKiloMeters.ONE
      ) {
        responseArray.push(sot);
      } else if (queryDto.filter === SotListFilter.SORTED) {
        responseArray.push(sot);
      }
    });
    return responseArray;
  }

  /**
   * Get Sot List Based On Search And Filters
   *
   * @return sots
   */
  async getSotList(queryDto: SotListQueryDto): Promise<Sot[]> {
    let query = `WHERE 1=1`;
    if (queryDto.search) { query += ` AND "name" ILIKE '%${queryDto.search}%' ` }
    switch (queryDto.filter) {
      case SotListFilter.NEAR_BY:
        query += ` AND ST_DWithin(sots."location"::geography, ST_GeomFromText('POINT(${queryDto.longitude
          } ${queryDto.latitude})', 4326)::geography, ${DistanceKiloMeters.ONE * 1000
          },true) ORDER BY ST_Distance("location", ST_GeogFromText('SRID=4326;POINT(${queryDto.longitude
          } ${queryDto.latitude})')) ASC `;
        break;
      case SotListFilter.SORTED:
        query += ' ORDER BY "name" ASC ';
    }
    const sql = `
                SELECT
                  "uuid",
                  "name",
                  "city",
                  "country",
                  "longitude",
                  "latitude",
                  ST_Distance("location", ST_GeogFromText('SRID=4326;POINT(${queryDto.longitude} ${queryDto.latitude})')) AS distance
                FROM
                    sots
                ${query}
            ;`;
    return await this.sotRepository.query(sql);
  }

  /**
   * Get Sot Map List Based On Search And Filters
   *
   * @param queryDto: MapSotListQueryDto
   * @return sots
   */
  async getMapSotList(queryDto: MapSotListQueryDto): Promise<Sot[]> {
    let query = '';
    switch (queryDto.filter) {
      case MapSotListFilter.AVAILABLE_FOR_SURVEY:
        query += `WHERE
                   s."uuid" NOT IN (
                    SELECT ss."sotId"
                    FROM
                    sots_surveys ss
                    GROUP BY ss."sotId"
                   )
                `;
        break;
      case MapSotListFilter.ONGOING_SURVEY:
        query += `INNER JOIN sots_surveys ss ON ss."sotId" = s."uuid"
					        INNER JOIN surveys su ON su."uuid" = ss."surveyId"
				          WHERE 
					          su."status" = '${SurveyStatus.ONGOING}';`;
    }
    const sql = `
                SELECT
                  s."uuid",
                  s."name",
                  s."city",
                  s."country",
                  s."longitude",
                  s."latitude"
                FROM
                    sots s
                ${query}
            ;`;
    return await this.sotRepository.query(sql);
  }

  /**
   * Get Sot on base on sot data
   *
   * @param data: SotDataInterface
   * @return sot
   */

  async retrieveSotData(data: SotDataInterface): Promise<Sot> {
    const newSot = new Sot();
    newSot.name = data.name;
    newSot.image = data.image;
    newSot.longitude = Number(data.metadata.Longitude);
    newSot.latitude = Number(data.metadata.Latitude);
    newSot.uniqueId = data.metadata.UUID;
    for (let i = 0; i < data.attributes.length; i++) {
      const { trait_type, value } = data.attributes[i];
      switch (trait_type) {
        case SotData.COUNTRY:
          newSot.country = value;
          break;
        case SotData.CITY:
          newSot.city = value;
          break;
        case SotData.GRADE:
          newSot.grade = value;
          break;
      }
    }
    return newSot;
  }

  /**
   * Add Sot data from Json File
   *
   * @param link: string
   * @param time: number
   * @param owner: string
   * @return void
   */
  async addSotData(link: string, time: number, owner: string) {
    try {
      const sot = await axios({ method: 'get', url: link });
      const sotData = await this.retrieveSotData(sot.data);
      sotData.location = {
        type: 'Point',
        coordinates: [sotData.longitude, sotData.latitude],
      };
      sotData.owner = owner;
      sotData.createdAt = time;
      return await this.sotRepository.save(sotData);
    } catch (err) {
      throw new HttpException(
        ResponseMessage.INTERNAL_ERROR,
        ResponseCode.INTERNAL_ERROR,
      );
    }
  }

  /**
   * Get Last Processed Nft block
   */
  async getLastNftBlock() {
    const block = await this.sotBlockRepository.findOne({
      keyName: BlockInfo.HEIGHT,
    });
    if (!block) return 0;
    return block.blockNumber;
  }

  /**
   * Update Last Processed Nft Block
   */
  async updateLastNftBlock(blockNumber: number) {
    const lastBlockHeight = await this.sotBlockRepository.findOne({
      keyName: BlockInfo.HEIGHT,
    });
    if (lastBlockHeight) {
      return await this.sotBlockRepository.update(
        { keyName: BlockInfo.HEIGHT },
        { blockNumber },
      );
    }
    const blockHeight = new SotBlock();
    blockHeight.keyName = BlockInfo.HEIGHT;
    blockHeight.blockNumber = blockNumber;
    return await this.sotBlockRepository.save(blockHeight);
  }

  /**
   * Get Sots By Survey Id
   * @param surveyId
   * @returns
   */
  public async sotsBySurveyId(surveyId: string): Promise<ISot[]> {
    let sql = `
    SELECT  
    json_agg(
      json_build_object(
        'sotId', sot."uniqueId", 'name', sot."name", 
        'sotOwner', sot."owner"
      )
    ) AS "sots" 
    FROM 
    sots_surveys ss 
    LEFT JOIN sots sot ON sot."uuid" = ss."sotId" 
    WHERE 
    ss."surveyId" = $1 
    GROUP BY 
    ss."surveyId"
  `;

    const sots = await this.sotRepository.query(sql, [surveyId]);
    return sots[0].sots;
  }
}
