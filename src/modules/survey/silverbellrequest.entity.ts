import { Entity, Column, PrimaryGeneratedColumn, BeforeInsert } from 'typeorm';
import dayjs from 'dayjs';
import { SilverBellRequestDto } from './common/survey.dtos';
import { SilverBellRequestStatus } from './common/survey.enums';
import { BaseEntity } from '../common/entity/base.entity';

@Entity({ name: 'silver_bell_requests' })
export class SilverBellRequest extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({ nullable: false })
  applicantName: string;

  @Column({ nullable: true })
  applicantCompany: string;

  @Column({ nullable: false })
  applicantEmail: string;

  @Column({ nullable: false })
  applicantPhoneNumber: string;

  @Column({ nullable: false })
  country: string;

  @Column({ nullable: false })
  surveyCountry: string;

  @Column({ default: SilverBellRequestStatus.PENDING })
  status: string;

  fromDto(payaload: SilverBellRequestDto): SilverBellRequest {
    this.applicantName = payaload.applicantName;
    this.applicantCompany = payaload.applicantCompany;
    this.applicantEmail = payaload.applicantEmail;
    this.applicantPhoneNumber = payaload.applicantPhoneNumber;
    this.country = payaload.country;
    this.surveyCountry = payaload.surveyCountry;
    return this;
  }
}
