import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ListInquiryDTO,
  RegisterInquiryReplyDTO,
} from '../customerservice/common/customerservice.dto';
import { getManager, Repository } from 'typeorm';
import { ResponseCode, ResponseMessage } from '../../../utils/enum';
import { Inquiry } from '../../../modules/customerservice/inquiry.entity';
import {
  AttachmentType,
  InquiryStatus,
} from '../../../modules/customerservice/common/customerservice.enum';
import { MediaService } from '../../../modules/media/media.service';
import { Media } from '../../../modules/media/media.entity';
import { InquiryAttachment } from '../../../modules/customerservice/inquiryattachment.entity';
import { Admin } from '../admin/admin.entity';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import { IListInquiryFilters } from './common/customerservice.types';
import { UsersService } from '../../user/user.service';
import { AdminUserService } from '../user/user.service';
import { S3Service } from '../../../utils/s3/s3.service';
import dayjs from 'dayjs';
import { InquiryStatusHistory } from '../../customerservice/inquirystatushistory.entity';

@Injectable()
export class AdminCustomerService {
  constructor(
    private readonly userService: UsersService,
    private readonly adminUserService: AdminUserService,
    private readonly mediaService: MediaService,
    private readonly s3Service: S3Service,
    @InjectRepository(Inquiry)
    private readonly inquiryRepo: Repository<Inquiry>,
    @InjectRepository(InquiryAttachment)
    private readonly inquiryAttachmentRepo: Repository<InquiryAttachment>,
    @InjectRepository(InquiryStatusHistory)
    private readonly inquiryStatusRepo: Repository<InquiryStatusHistory>,
  ) { }

  /**
   *
   * @param payload
   * @returns
   */
  public async doReply(payload: RegisterInquiryReplyDTO, adminUser: Admin) {
    const inquiry = await this.inquiryRepo.findOne({
      where: { uuid: payload.inquiryId },
    });

    if (!inquiry) {
      throw new HttpException(
        ResponseMessage.INQUIRY_NOT_EXIST,
        ResponseCode.INQUIRY_NOT_EXIST,
      );
    }
    if (
      [
        InquiryStatus.COMPLETED.toString(),
        InquiryStatus.DISCARDED.toString(),
      ].includes(inquiry.status) ||
      payload.status == InquiryStatus.WAITING_FOR_AN_ANSWER
    ) {
      throw new HttpException(
        {
          statusCode: ResponseCode.INVALID_INQUIRY_STATUS,
          message: ResponseMessage.INVALID_INQUIRY_STATUS,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    if (
      payload.status == InquiryStatus.IN_PROGRESS &&
      [
        InquiryStatus.COMPLETED.toString(),
        InquiryStatus.DISCARDED.toString(),
        InquiryStatus.IN_PROGRESS.toString(),
      ].includes(inquiry.status)
    ) {
      throw new HttpException(
        {
          statusCode: ResponseCode.INVALID_INQUIRY_STATUS,
          message: ResponseMessage.INVALID_INQUIRY_STATUS,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    if (payload.status == InquiryStatus.COMPLETED && !payload.reply) {
      throw new HttpException(
        {
          statusCode: ResponseCode.INQUIRY_REPLY_NEEDED,
          message: ResponseMessage.INQUIRY_REPLY_NEEDED,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    let medias: Media[];
    if (payload.attachments) {
      medias = await this.mediaService.getMediaByKeys(payload.attachments);
    }
    if (payload.attachments && payload.attachments.length !== medias.length) {
      throw new HttpException(
        {
          statusCode: ResponseCode.INVALID_S3_KEY,
          message: ResponseMessage.INVALID_S3_KEY,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    if (inquiry && payload.attachments) {
      const inquiryAttachment: InquiryAttachment[] = [];
      payload.attachments.map(async (m) => {
        inquiryAttachment.push(
          this.inquiryAttachmentRepo.create({
            inquiryId: inquiry,
            image: m,
            type: AttachmentType.ADMIN,
          }),
        );
      });
      await this.inquiryAttachmentRepo.save(inquiryAttachment);
    }
    inquiry.status = payload.status;
    let inquiryHistoryObject = new InquiryStatusHistory();
    inquiryHistoryObject.admin = adminUser;
    inquiryHistoryObject.memo = payload.memo;
    inquiryHistoryObject.inquiry = inquiry;
    if (payload.status === InquiryStatus.COMPLETED)
      inquiry.reply = payload.reply;
    await this.inquiryStatusRepo.save(inquiryHistoryObject);
    await this.inquiryRepo.save(inquiry);
    return;
  }

  /**
   *
   * @param queryOptions
   * @param pagination
   */
  public async getList(
    queryOptions: ListInquiryDTO,
    pagination: IPaginationOptions,
  ) {
    const format: IListInquiryFilters = {
      startDate: queryOptions.start_date
        ? `AND I."createdAt" >= ${queryOptions.start_date}`
        : '',
      endDate: queryOptions.end_date
        ? `AND I."createdAt" <= ${queryOptions.end_date}`
        : '',
      username: queryOptions.username
        ? `AND U."nickName" LIKE '%${queryOptions.username}%'`
        : '',
      status: queryOptions.status
        ? `AND I."status" LIKE '%${queryOptions.status}%'`
        : '',
      uuid: queryOptions.uuid ? `AND U."uuid" = '${queryOptions.uuid}'::uuid` : '',
    };
    const filter = Object.values(format).join('');
    const sql = `
        SELECT 
            q1.*,
            COALESCE(q2."attachment_count", 0) AS attachments,
            q3."admin"
        FROM
            (SELECT 
                I."uuid",
                TO_CHAR(TO_TIMESTAMP(I."createdAt"),'DD/MM/YYYY') AS "createdAt",
                U."nickName" AS username,
                I."title",
                I."content" AS description,
                I."status"
            FROM
                inquiries AS I
            INNER JOIN users AS U ON U."uuid" = I."userId"
            WHERE
                1=1
                ${filter} ORDER BY I."createdAt" DESC 
            ) AS q1
        LEFT JOIN
            (
                SELECT 
                    IA."inquiryId",
                    COUNT(*) AS attachment_count
                FROM
                    inquiries_attachments AS IA
                GROUP BY
                    IA."inquiryId"
            ) AS q2
        ON q1."uuid" = q2."inquiryId"
        LEFT JOIN
			(
				SELECT
          ISH."inquiryId",
	        A."email" AS ADMIN
        FROM INQUIRY_STATUS_HISTORY AS ISH
        LEFT JOIN ADMINS AS A ON A."uuid" = ISH."adminId"
        ORDER BY ISH."createdAt" DESC
        LIMIT 1
			) AS q3
			ON q3."inquiryId" = q1."uuid"
        LIMIT $1 OFFSET $2 
        `;
    const limit = Number(pagination.limit);
    const page = Number(pagination.page);
    const result = await getManager().query(sql, [limit, limit * (page - 1)]);
    const totalSql = `
        SELECT 
          COUNT(*) as count
        FROM
          inquiries AS I
        INNER JOIN users AS U ON U."uuid" = I."userId"
        WHERE
          1=1
          ${filter}
        `;
    const { count } = (await getManager().query(totalSql))?.[0];
    return {
      result,
      meta: {
        totalCount: count
      }
    }
  }

  /**
   *
   * @param uuid
   * @returns
   */
  public async getDetails(uuid: string) {
    const inquiry = await this.inquiryRepo.findOne({
      where: { uuid },
      relations: ['user', 'attachments', 'user.sessionInfo', 'user.wallet'],
    });
    if (!inquiry) {
      throw new HttpException(
        {
          message: ResponseMessage.INQUIRY_NOT_EXIST,
          statusCode: ResponseCode.INQUIRY_NOT_EXIST,
        },
        ResponseCode.BAD_REQUEST,
      );
    }
    const inquiryStatus = await this.inquiryStatusRepo.find({
      where: { inquiry: inquiry.uuid },
      relations: ['admin'],
    });
    const { user, ...inquiryDetails } = inquiry;
    const noOfInquiries = await this.inquiryRepo.findAndCount({
      where: {
        user,
      },
    });
    const {
      email,
      nickName,
      createdAt,
      country,
      referralCode,
      wallet: { balance },
      sessionInfo: { deviceInfo },
      uuid: UserUuid,
      ...otherData
    } = user;
    const recommender = await this.adminUserService.getUserRecommender(user);
    const { attachments } = inquiryDetails;
    if (attachments?.length) {
      attachments.map((att) => {
        att.image = this.s3Service.getPublicURL(att.image)
      })
    }
    if (inquiryStatus?.length) {
      inquiryStatus.map((reply) => {
        delete reply.admin.created_at;
        delete reply.admin.emailConfirmed;
        delete reply.admin.password;
        delete reply.admin.status;
        delete reply.admin.twoFa;
        delete reply.admin.twoFaKey;
        delete reply.admin.uuid;
      })
    }
    return {
      inquiry: inquiryDetails,
      user: {
        uuid: UserUuid,
        email,
        nickName,
        recommender: recommender?.email,
        registrationDate: createdAt,
        noOfSOM: balance,
        noOfInquiries: noOfInquiries.length,
        country,
        deviceUsed: deviceInfo ? JSON.parse(deviceInfo) : null,
        referralCode
      },
      statusHistory: inquiryStatus
    }
  }
}
