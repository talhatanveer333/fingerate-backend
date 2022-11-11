import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Notice } from '../../notice/notice.entity';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';
import { NoticeDTO, NoticeListSearch } from './commons/notice.dto';
import { MediaService } from '../../media/media.service';
import { ResponseCode, ResponseMessage } from '../../../utils/enum';
import { S3Service } from '../../../utils/s3/s3.service';

@Injectable()
export class NoticeService {
  constructor(
    @InjectRepository(Notice)
    private readonly noticeRepo: Repository<Notice>,
    private readonly mediaService: MediaService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   *
   * @param uuid
   * @returns
   */
  public async getNotice(uuid: string) {
    const notice = await this.noticeRepo.findOne({
      where: {
        uuid,
      },
    });
    if (!notice) {
      throw new HttpException(
        {
          statusCode: ResponseCode.NOTICE_DOES_NOT_EXISTS,
          message: ResponseMessage.NOTICE_DOES_NOT_EXISTS,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    return notice;
  }

  /**
   * Validate image from media service
   */
  public async validateImage(key: string): Promise<string> {
    const medias = await this.mediaService.getMediaByKeys([key]);
    if (!medias?.length)
      throw new HttpException(
        {
          statusCode: ResponseCode.INVALID_S3_KEY,
          message: ResponseMessage.INVALID_S3_KEY,
        },
        ResponseCode.BAD_REQUEST,
      );
    await this.mediaService.removeMedia([key]);
    return this.s3Service.getPublicURL(key);
  }

  /**
   * Create Notice
   *
   * @params payload
   * @returns notice
   */
  public async create(payload: NoticeDTO) {
    payload.image = await this.validateImage(payload.image);
    const notice = new Notice().fromDto(payload);
    await this.noticeRepo.save(notice);
    return notice;
  }

  /**
   * Update Notice
   *
   * @params payload
   * @returns notice
   */
  public async update(uuid: string, payload: NoticeDTO) {
    const notice = await this.noticeRepo.findOne({ where: { uuid } });
    if (!notice)
      throw new HttpException(
        {
          statusCode: ResponseCode.FAQ_DOES_NOT_EXISTS,
          message: ResponseMessage.FAQ_DOES_NOT_EXISTS,
        },
        ResponseCode.BAD_REQUEST,
      );
    if (notice.image !== payload.image)
      payload.image = await this.validateImage(payload.image);
    notice.fromDto(payload);
    await this.noticeRepo.save(notice);
    return notice;
  }

  /**
   * Get All Notices
   *
   * @params query
   * @params paginationOption
   * @returns notices
   */
  public async find(
    { search }: NoticeListSearch,
    paginationOption: IPaginationOptions,
  ) {
    let condition: object;
    if (search?.length) {
      condition = [
        { content: ILike(`%${search}%`) },
        { title: ILike(`%${search}%`) },
      ];
    }
    return await this.paginate(paginationOption, condition);
  }

  /**
   * Paginate Notice
   *
   * @param options
   * @param condition
   * @param relations
   * @returns
   */
  private async paginate(
    options: IPaginationOptions,
    condition?: Object,
    relations?: string[],
  ): Promise<Pagination<Notice>> {
    return paginate<Notice>(this.noticeRepo, options, {
      order: { createdAt: 'DESC' },
      where: condition,
      relations,
    });
  }
}
