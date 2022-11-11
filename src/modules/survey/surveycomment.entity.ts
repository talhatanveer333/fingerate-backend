import { BaseEntity } from '../common/entity/base.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm';
import { SurveyCommentLike } from './surveycommentlike.entity';

@Entity({
  name: 'survey_comments',
})
export class SurveyComment extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({ default: 0 })
  likes: number;

  @Column({ 
    default: 0,
    nullable: true
  })
  likesHistory: number;

  @Column()
  body: string;

  @OneToMany(
    () => SurveyCommentLike,
    (surveyCommentLike) => surveyCommentLike.commentId,
  )
  commentLikes: SurveyCommentLike[];

  fromDto(payload: any): SurveyComment {
    this.body = payload.body;
    return this;
  }
}
