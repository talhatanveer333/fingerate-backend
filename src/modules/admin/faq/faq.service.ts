import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { FAQ } from '../../faq/faq.entity';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';
import { FaqDTO, FAQListSearch } from './commons/faq.dto';
import { MediaService } from '../../media/media.service';
import { ResponseCode, ResponseMessage } from '../../../utils/enum';
import { S3Service } from '../../../utils/s3/s3.service';

@Injectable()
export class FaqService {
  constructor(
    @InjectRepository(FAQ)
    private readonly faqRepo: Repository<FAQ>,
    private readonly mediaService: MediaService,
    private readonly s3Service: S3Service,
  ) { }

  /**
   * 
   * @param uuid 
   */
  public async getFAQ(uuid: string) {
    const faq = await this.faqRepo.findOne({
      where: {
        uuid
      }
    });
    if (!faq) {
      throw new HttpException({
        statusCode: ResponseCode.FAQ_DOES_NOT_EXISTS,
        message: ResponseMessage.FAQ_DOES_NOT_EXISTS
      },
        ResponseCode.BAD_REQUEST)
    }
    return faq;
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
   * Create FAQ
   *
   * @params payload
   * @returns faq
   */
  public async create(payload: FaqDTO) {
    payload.image = await this.validateImage(payload.image);
    const faq = new FAQ().fromDto(payload);
    await this.faqRepo.save(faq);
    return faq;
  }

  /**
   * Update FAQ
   *
   * @params payload
   * @returns faq
   */
  public async update(uuid: string, payload: FaqDTO) {
    const faq = await this.faqRepo.findOne({ where: { uuid } });
    if (!faq)
      throw new HttpException(
        {
          statusCode: ResponseCode.FAQ_DOES_NOT_EXISTS,
          message: ResponseMessage.FAQ_DOES_NOT_EXISTS,
        },
        ResponseCode.BAD_REQUEST,
      );
    if (faq.image !== payload.image)
      payload.image = await this.validateImage(payload.image);
    faq.fromDto(payload);
    await this.faqRepo.save(faq);
    return faq;
  }

  /**
   * Get All FAQs
   *
   * @params query
   * @params paginationOption
   * @returns faqs
   */
  public async find(
    { search }: FAQListSearch,
    paginationOption: IPaginationOptions,
  ) {
    let condition: object;
    if (search?.length) {
      condition = [
        { title: Like(`%${search}%`) },
        { content: Like(`%${search}%`) },
      ];
    }
    return await this.paginate(paginationOption, condition);
  }

  /**
   * Paginate FAQ
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
  ): Promise<Pagination<FAQ>> {
    return paginate<FAQ>(this.faqRepo, options, {
      order: { createdAt: 'DESC' },
      where: condition,
      relations,
    });
  }
}
