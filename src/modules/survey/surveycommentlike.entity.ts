import { User } from '../../modules/user/user.entity';
import {
  Entity,
  Column,
  OneToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { SurveyComment } from './surveycomment.entity';
import { BaseEntity } from '../common/entity/base.entity';

@Entity({ name: 'surveys_comments_likes' })
export class SurveyCommentLike extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  userId: User;

  @ManyToOne(() => SurveyComment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'commentId' })
  commentId: SurveyComment;
}
