import { Sot } from '../sot/sot.entity';
import { Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Survey } from './survey.entity';

@Entity({ name: 'sots_surveys' })
export class SotSurvey {
  @ManyToOne(() => Survey, (survey) => survey.uuid, { primary: true })
  @JoinColumn({ name: 'surveyId' })
  survey: Survey;

  @ManyToOne(() => Sot, (sot) => sot.uuid, { primary: true })
  @JoinColumn({ name: 'sotId' })
  sot: Sot;
}
