import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IOption } from './common/survey.interface';
import { Survey } from './survey.entity';

@Entity({
  name: 'survey_options',
})
export class SurveyOption {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column({ nullable: true })
  image: string;

  @Column({ nullable: true })
  colour: string;

  @Column({ nullable: true })
  sequenceNumber: number;

  @ManyToOne(() => Survey, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'surveyId' })
  survey: Survey;

  fromDto(payload: IOption, survey: Survey): SurveyOption {
    this.name = payload.name;
    this.description = payload.description;
    this.colour = payload.colour;
    this.image = payload.image ? payload.image : null;
    this.survey = survey;
    return this;
  }
}
