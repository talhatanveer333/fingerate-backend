import { HttpException, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ResponseCode, ResponseMessage } from '../../utils/enum';
import { User } from '../user/user.entity';
import { Inquiry } from './inquiry.entity';
import {
  InquiryParamDto,
  RegisterInquiryDto,
  EditInquiryDto,
} from './common/customerservice.dtos';
import { InquiryAttachment } from './inquiryattachment.entity';
import { MediaService } from '../../modules/media/media.service';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';
import { S3Service } from '../../utils/s3/s3.service';
import { S3KeyDto } from 'modules/media/commons/media.dto';
import { Media } from '../../modules/media/media.entity';
import { InquiryStatus } from './common/customerservice.enum';

@Injectable()
export class CustomerService {
  constructor(
    private readonly s3Service: S3Service,

    @InjectRepository(Inquiry)
    private readonly customerServiceRepository: Repository<Inquiry>,
    @InjectRepository(InquiryAttachment)
    private readonly inquiryAttachmentRepository: Repository<InquiryAttachment>,
    private readonly mediaService: MediaService,
  ) { }

  /** ******************************************************************************************************************/
  /*
  /*                                    Customer inquiry
  /*
  /********************************************************************************************************************/
  /** Register new Inquiry
   *
   * @body payload
   * @CurrentUser user
   * @returns
   */
  public async registerInquiry(payload: RegisterInquiryDto, user: User) {
    try {
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
      const newInquiry = new Inquiry().fromDto(payload);
      newInquiry.user = user;
      const inquiry = await this.customerServiceRepository.save(newInquiry);
      const inquiryAttachment: InquiryAttachment[] = [];
      if (inquiry && payload.attachments) {
        payload.attachments.map(async (m) => {
          inquiryAttachment.push(
            this.inquiryAttachmentRepository.create({
              inquiryId: inquiry,
              image: m,
            }),
          );
        });
        await this.inquiryAttachmentRepository.save(inquiryAttachment);
        await this.mediaService.removeMedia(payload.attachments);
      }
      return;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get Inquires List with pagination
   *
   *@currentUser user
   *@paginationOption IPaginationOptions
   * @returns inquires
   */
  public async getInquiriesList(
    paginationOption: IPaginationOptions,
    user: User,
  ) {
    const inquires: any = await this.paginate(paginationOption, { user }, ["attachments"]);
    inquires.items.map(async (item) => {
      item.image = item.attachments[0] ? this.s3Service.getSignedURL(item.attachments[0].image) : '';
      delete item.attachments
    });
    return {
      inquires,
    };
  }

  /** Delete Inquiry by inquiryId
   *
   * @param inquiryParam
   * @CurrentUser user
   * @returns
   */
  public async deleteInquiry(inquiryParam: InquiryParamDto, user: User) {
    try {
      const inquiry = await this.getInquirybyIdAndUser(
        inquiryParam.inquiryId,
        user,
      );
      if (inquiry.status !== InquiryStatus.WAITING_FOR_AN_ANSWER) {
        throw new HttpException(
          {
            statusCode: ResponseCode.INQUIRY_CAN_NOT_DELETE,
            message: ResponseMessage.INQUIRY_CAN_NOT_DELETE,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      return await this.customerServiceRepository.delete({
        uuid: inquiry.uuid,
      });
    } catch (error) {
      throw error;
    }
  }

  /** Edit Inquiry fields from inquiryId 
   *
   * @param inquiry
   * @CurrentUser user
   * @returns
   */
  public async editInquiry(
    inquiryParam: InquiryParamDto,
    payload: EditInquiryDto,
    user: User,
  ): Promise<Inquiry> {
    try {
      const inquiry = await this.getInquirybyIdAndUser(
        inquiryParam.inquiryId,
        user,
      );
      let attachments = inquiry.attachments ? inquiry.attachments.length : 0;
      payload.attachments
        ? (attachments = payload.attachments.length + attachments)
        : 0;
      if (attachments > 3) {
        throw new HttpException(
          {
            statusCode: ResponseCode.MAX_ATTACHMENT_SIZE_ARE_THREE,
            message: ResponseMessage.MAX_ATTACHMENT_SIZE_ARE_THREE,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      if (inquiry.status !== InquiryStatus.WAITING_FOR_AN_ANSWER) {
        throw new HttpException(
          {
            statusCode: ResponseCode.INQUIRY_CAN_NOT_EDIT,
            message: ResponseMessage.INQUIRY_CAN_NOT_EDIT,
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
      inquiry.title = payload.title;
      inquiry.content = payload.content;
      const inquiryUpdate = await this.customerServiceRepository.save(inquiry);
      if (inquiryUpdate && payload.attachments) {
        const inquiryAttachment: InquiryAttachment[] = [];
        payload.attachments.map(async (m) => {
          inquiryAttachment.push(
            this.inquiryAttachmentRepository.create({
              inquiryId: inquiryUpdate,
              image: m,
            }),
          );
        });
        await this.inquiryAttachmentRepository.save(inquiryAttachment);
      }
      return;
    } catch (error) {
      throw error;
    }
  }

  /** Delete Attachment of inquiry by id  
   * @param key
   * @CurrentUser user
   * @returns
   */
  public async deleteInquiryAttachment(id: string, user: User): Promise<void> {
    try {
      const attachment = await this.inquiryAttachmentRepository.findOne({
        where: { uuid: id },
        relations: ['inquiryId', 'inquiryId.user'],
      });
      if (!attachment) {
        throw new HttpException(
          {
            statusCode: ResponseCode.ATTACHMENT_NOT_EXIST,
            message: ResponseMessage.ATTACHMENT_NOT_EXIST,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      if (attachment.inquiryId.user.uuid !== user.uuid) {
        throw new HttpException(
          {
            statusCode: ResponseCode.UNAUTHORIZED_TO_DELETE_ATTACHMENT,
            message: ResponseMessage.UNAUTHORIZED_TO_DELETE_ATTACHMENT,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      if (attachment.inquiryId.status !== InquiryStatus.WAITING_FOR_AN_ANSWER) {
        throw new HttpException(
          {
            statusCode: ResponseCode.ATTACHMENT_CAN_NOT_DELETE,
            message: ResponseMessage.ATTACHMENT_CAN_NOT_DELETE,
          },
          ResponseCode.BAD_REQUEST,
        );
      }
      await this.inquiryAttachmentRepository.delete({
        uuid: id,
      });
      return;
    } catch (error) {
      throw error;
    }
  }

  /** get inquiry detail of owner and attachments   
   *
   * @param inquiryId
   * @CurrentUser user
   * @returns inquiry
   */
  public async getInquirybyIdAndUser(
    inquiryId: string,
    user: User,
    requireKey = true,
  ): Promise<Inquiry> {
    const inquiry = await this.customerServiceRepository.findOne({
      where: { uuid: inquiryId, user },
      relations: ['attachments'],
    });
    if (!inquiry) {
      throw new HttpException(
        ResponseMessage.INQUIRY_NOT_EXIST,
        ResponseCode.INQUIRY_NOT_EXIST,
      );
    }
    if (!requireKey) {
      inquiry.attachments.map(
        (attachment) =>
        (attachment.image = attachment.image
          ? this.s3Service.getSignedURL(attachment.image)
          : null),
      );
    }
    return inquiry;
  }

  /**
   * common paginate inquiries
   *
   * @param options
   * @param condition
   * @param relations
   * @returns inquires
   */
  private async paginate(
    options: IPaginationOptions,
    condition?: Object,
    relations?: string[],
  ): Promise<Pagination<Inquiry>> {
    return paginate<Inquiry>(this.customerServiceRepository, options, {
      order: { createdAt: 'DESC' },
      where: condition,
      relations,
    });
  }
}
