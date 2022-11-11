import { HttpException, Injectable } from '@nestjs/common';
import { JOB, ResponseCode, ResponseMessage } from '../../utils/enum';
import { S3Service } from '../../utils/s3/s3.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Media } from './media.entity';
import { In, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoggerService } from '../../utils/logger/logger.service';
import dayjs from 'dayjs';
import { Minutes } from '../auth/common/auth.enums';

@Injectable()
export class MediaService {
  constructor(
    private readonly s3Service: S3Service,
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    private readonly loggerService: LoggerService,
  ) {}

  /**
   * upload Image from multer
   * 
   * @param image Express.Multer.File
   * @returns key, signed_url
   */
  public async uploadImage(image: Express.Multer.File) {
    try {
      const uploadedFile: any = await this.s3Service.upload(image);
      const signed_url = this.s3Service.getSignedURL(uploadedFile?.Key);
      await this.createMedia(uploadedFile?.Key);
      return { key: uploadedFile?.Key, signed_url };
    } catch (error) {
      throw error;
    }
  }

  /**
   * delete Image by key
   * @param key
   * @returns void
   */
  public async deleteImage(key: string): Promise<void> {
    try {
      const data = await this.mediaRepository.findOne({ key });
      if (!data) {
        throw new HttpException(
          ResponseMessage.S3_KEY_NOT_EXIST,
          ResponseCode.BAD_REQUEST,
        );
      }
      await this.s3Service.deleteObject(key);
      await this.mediaRepository.delete({ key });
      return;
    } catch (error) {
      throw error;
    }
  }

  /** 
   * create Media by key
   *  
   * @param key
   * @returns void
   */
  public async createMedia(key: string): Promise<void> {
    const media = new Media();
    media.key = key;
    await this.mediaRepository.save(media);
    return;
  }

  /**
   * get Media list By array of Keys
   * 
   * @param keys:string[]
   * @returns keys
   */
  public async getMediaByKeys(keys: string[]): Promise<Media[]> {
    return await this.mediaRepository.find({
      where: { key: In(keys) },
    });
  }

  /**
   * remove Media by array of keys
   * 
   * @param keys: string[]
   * @returns void
   */
  public async removeMedia(keys: string[]): Promise<void> {
    await this.mediaRepository.delete({ key: In(keys) });
    return;
  }

  /*
   * Delete Images Cron
   * Run After Every 12 Hours
   */
  @Cron(CronExpression.EVERY_12_HOURS, {
    name: JOB.DELETE_IMAGES,
  })
  async deleteImagesJob() {
    this.loggerService.log(`Delete Images job start at: ${dayjs().unix()}`);
    const medias = await this.mediaRepository.find();
    medias.map(async (media) => {
      const diff = dayjs
        .unix(dayjs().unix())
        .diff(dayjs.unix(media.createdAt), 'm');
      if (diff >= Minutes.FIVE) {
        await this.deleteImage(media.key);
        this.loggerService.log(
          `Delete Images Job completed for: ${media.uuid}`,
        );
      }
    });
    this.loggerService.log(`Delete Images job completed at: ${dayjs().unix()}`);
  }
}
