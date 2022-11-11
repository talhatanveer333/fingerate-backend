import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notice } from './notice.entity';
import { NoticeStatusEnum } from './commons/notice.enum';
import { ResponseCode, ResponseMessage } from '../../utils/enum';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';

@Injectable()
export class NoticeService {
  constructor(
    @InjectRepository(Notice)
    private readonly noticeRepository: Repository<Notice>,
  ) { }

  /**
   * Get active Notices with pagination
   *
   * @param limit
   * @param page
   * @returns notices, total
   */
  public async find({
    limit,
    page,
  }: IPaginationOptions): Promise<{ notices: Notice[]; total: number }> {
    limit = Number(limit);
    page = Number(page) - 1;
    const notices = await this.noticeRepository.query(
      `SELECT * FROM notices WHERE status = $1 ORDER BY "createdAt" ASC LIMIT $2 OFFSET $3`,
      [NoticeStatusEnum.ACTIVE, limit, limit * page],
    );
    const noticesCount = await this.noticeRepository.query(
      `SELECT COUNT(*) as total FROM notices WHERE status = $1 `,
      [NoticeStatusEnum.ACTIVE],
    );
    return { notices: notices as Notice[], total: noticesCount[0].total };
  }
}
