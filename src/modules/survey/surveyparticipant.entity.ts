import { User } from '../../modules/user/user.entity';
import {
  Entity,
  Column,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { Survey } from './survey.entity';
import { SurveyOption } from './surveyoptions.entity';
import { SurveyComment } from './surveycomment.entity';

@Entity({ name: 'surveys_participants' })
export class SurveyParticipant {
  @ManyToOne(() => Survey, (survey) => survey.uuid, {
    primary: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'surveyId' })
  surveyId: Survey;

  @ManyToOne(() => User, (user) => user.uuid, {
    primary: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  userId: User;

  @ManyToOne(() => SurveyOption, (surveyOption) => surveyOption.uuid)
  @JoinColumn({ name: 'OptionId' })
  OptionId: SurveyOption;

  @OneToOne(() => SurveyComment)
  @JoinColumn({ name: 'commentId' })
  surveyComment: SurveyComment;
}
