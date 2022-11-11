import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FAQ } from './faq.entity';
import { FAQStatusEnum } from './commons/faq.enum';
import { ResponseCode, ResponseMessage } from '../../utils/enum';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';

@Injectable()
export class FaqService {
  constructor(
    @InjectRepository(FAQ)
    private readonly faqRepository: Repository<FAQ>,
  ) {}

  /**
   * Get active FAQs with pagination
   *
   * @param limit 
   * @param page
   * @returns faqs, total
   */
  public async find({
    limit,
    page,
  }: IPaginationOptions): Promise<{ faqs: FAQ[]; total: number }> {
    limit = Number(limit);
    page = Number(page) - 1;
    const faqs = await this.faqRepository.query(
      `SELECT * FROM faqs WHERE status = $1 ORDER BY "createdAt" ASC LIMIT $2 OFFSET $3`,
      [FAQStatusEnum.ACTIVE, limit, limit * page],
    );
    const faqsCount = await this.faqRepository.query(
      `SELECT COUNT(*) as total FROM faqs WHERE status = $1`,
      [FAQStatusEnum.ACTIVE],
    );
    return { faqs: faqs as FAQ[], total: faqsCount[0].total };
  }
}
