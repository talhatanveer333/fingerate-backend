import { User } from '../user/user.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
  TableInheritance,
  OneToOne,
  BeforeInsert,
} from 'typeorm';
import { SurveyStatus, SurveyType } from './common/survey.enums';
import { VerifiedEmail } from '../verified-email/verifiedemail.entity';
import { Sot } from '../../modules/sot/sot.entity';
import { SurveyOption } from './surveyoptions.entity';
import { RegisterSurveyDto } from './common/survey.dtos';
import { BaseEntity } from '../common/entity/base.entity';
@Entity({
  name: 'surveys',
})
export class Survey extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({ nullable: true })
  startingDate: number;

  @Column({ nullable: true })
  endingDate: number;

  @Column({ default: false })
  feePaid: boolean;

  @Column({ default: SurveyStatus.DISABLED })
  status: string;

  @Column({ length: 255 })
  type: string;

  @Column({ nullable: true })
  totalSots: number;

  @Column({ nullable: true })
  question: string;

  @Column({ default: false })
  limitedParticipants: boolean;

  @Column({ nullable: true })
  participantsCount: number;

  @Column({ nullable: true })
  rewardeesCount: number;

  @Column({ nullable: true })
  rewardAmount: number;

  @Column({ default: false })
  previewComments: boolean;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'initiatorId' })
  initiator: User;

  @OneToMany(() => SurveyOption, (surveyOptions) => surveyOptions.survey)
  options: SurveyOption[];

  @Column()
  email: string;

  fromDto(payload: RegisterSurveyDto): Survey {
    this.type = payload.type;
    this.startingDate = payload.startingDate;
    this.endingDate = payload.endingDate;
    this.limitedParticipants = payload.limitedParticipants;
    this.participantsCount = payload.participantsCount;
    this.previewComments = payload.previewComments;
    this.question = payload.question;
    this.rewardAmount = payload.rewardAmount;
    this.rewardeesCount = payload.rewardeesCount;
    return this;
  }
}
