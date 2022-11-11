import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/modules/main/app.module';
import { ValidationPipe } from '@nestjs/common';
import { AdminHelper } from '../admin.helper';
import request from 'supertest';
import { LoggerService } from '../../src/utils/logger/logger.service';
import { MailService } from '../../src/utils/mailer/mail.service';
import { MailerMock, LoggerMock, SotDataMock, ExchangeServiceMock, CoinGeckoServiceMock } from '../mocks/mocks';
import { BlockProcessor } from '../../src/modules/sot/block.processor.job';
import { JobEvents } from '../../src/modules/sot/common/sot.enums';
import { SotDataService } from '../../src/modules/sot/sot.data.service';
import { ResponseMessage } from '../../src/utils/enum';
import { uuid } from 'aws-sdk/clients/customerprofiles';
import { SilverBellRequestStatus } from '../../src/modules/survey/common/survey.enums';
import { ExchangeService } from '../../src/utils/currencyconverter/exchange.service';
import { CoinGeckoMarket } from '../../src/utils/currencyconverter/coingecko.service';

describe('Fingerate admin survey test', () => {
  let surveyId: string;
  let app: INestApplication;
  let helper: AdminHelper;
  let blockProcessor: BlockProcessor;
  let job: any = {};
  let server: any;
  let survey;
  let sot;
  let user;
  let silverBell;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue(MailerMock)
      .overrideProvider(SotDataService)
      .useValue(SotDataMock)
      .overrideProvider(LoggerService)
      .useValue(LoggerMock)
      .overrideProvider(ExchangeService)
      .useValue(ExchangeServiceMock)
      .overrideProvider(CoinGeckoMarket)
      .useValue(CoinGeckoServiceMock)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    helper = new AdminHelper(app);
    blockProcessor = app.get(BlockProcessor);
    await helper.init();
    server = app.getHttpServer();
    const {
      survey: createdSurvey,
      user: createdUser,
      sot: createdSot,
    } = await helper.createSurveyProcess();
    survey = createdSurvey;
    sot = createdSot;
    user = createdUser;
    surveyId = survey.uuid;
    silverBell = await helper.silverBellProcess();
  });

  it(`Test /admin/survey/id/:uuid`, async () => {
    const expected = {
      title: 'Test survery',
      type: 'single',
      status: 'disabled',
      rewardAmount: 5,
      participationCount: 1,
      sots: [
        {
          sot_name: 'Pakistan',
          address: 'Seoul South Korea',
        },
      ],
      options: [
        {
          option: 'good',
          description: 'Testing',
          image: null,
        },
        {
          option: 'good',
          description: 'Testing',
          image: null,
        },
      ],
    };
    await request(server)
      .get(`/api/admin/survey/id/${survey.uuid}`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        const {
          surveyId,
          createdAt,
          startingDate,
          endingDate,
          ...updatedData
        } = body.data;
        body.data = updatedData;
        body.data.options.map((m) => {
          delete m.option_id;
        })
        body.data.sots.map((s) => {
          delete s.sot_id;
        })
        expect(body.data).toEqual(expected);
      });
  });

  it(`Test /admin/survey/chart_by_option/:uuid API`, async () => {
    const expected = {
      totalCount: 1,
      optionPercentage: [
        {
          optionName: 'good',
          optionColour: '#DF6GTYH',
          percentage: 100,
        },
      ],
    };
  });

  it(`Test admin/survey/list`, async () => {
    const expected = {
      title: 'Test survery',
      participants: '1',
      reward_som: 5,
      survey_type: 'single',
    };
    await request(server)
      .get('/api/admin/survey/list')
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        const {
          creation_date,
          starting_date,
          ending_date,
          email,
          uuid,
          ...remainingBody
        } = body.data.surveys[0];
        expect(remainingBody).toEqual(expected);
      });
  });

  it(`Test /admin/survey/survey_gender_statistics/:uuid`, async () => {
    const expected = {
      name: 'good',
      colour: '#DF6GTYH',
      totalCount: 0,
      maleCount: 0,
      femaleCount: 0,
      femalePercentage: 0,
      malePercentage: 0,
    };
    await request(server)
      .get(`/api/admin/survey/survey_gender_statistics/${surveyId}`)
      .set('Authorization', helper.getAccessToken())
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect(({ body }) => {
        body.data.map((i) => {
          delete i.uuid;
          delete i.sequenceNumber;
        });
        expect(body.data[1]).toEqual(expected);
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it(`Test /admin/survey/survey_age_statistics/:uuid`, async () => {
    const expected = [
      {
        age: 10,
        options: [
          {
            optionName: 'good',
            optionPercentage: 0,
            optionColour: '#DF6GTYH',
          },
          {
            optionName: 'good',
            optionPercentage: 0,
            optionColour: '#DF6GTYH',
          },
        ],
      },
      {
        age: 20,
        options: [
          {
            optionName: 'good',
            optionPercentage: 0,
            optionColour: '#DF6GTYH',
          },
          {
            optionName: 'good',
            optionPercentage: 0,
            optionColour: '#DF6GTYH',
          },
        ],
      },
      {
        age: 30,
        options: [
          {
            optionName: 'good',
            optionPercentage: 100,
            optionColour: '#DF6GTYH',
          },
          {
            optionName: 'good',
            optionPercentage: 0,
            optionColour: '#DF6GTYH',
          },
        ],
      },
      {
        age: 40,
        options: [
          {
            optionName: 'good',
            optionPercentage: 0,
            optionColour: '#DF6GTYH',
          },
          {
            optionName: 'good',
            optionPercentage: 0,
            optionColour: '#DF6GTYH',
          },
        ],
      },
      {
        age: 50,
        options: [
          {
            optionName: 'good',
            optionPercentage: 0,
            optionColour: '#DF6GTYH',
          },
          {
            optionName: 'good',
            optionPercentage: 0,
            optionColour: '#DF6GTYH',
          },
        ],
      },
      {
        age: 60,
        options: [
          {
            optionName: 'good',
            optionPercentage: 0,
            optionColour: '#DF6GTYH',
          },
          {
            optionName: 'good',
            optionPercentage: 0,
            optionColour: '#DF6GTYH',
          },
        ],
      },
    ];
    await request(server)
      .get(`/api/admin/survey/survey_age_statistics/${surveyId}`)
      .set('Authorization', helper.getAccessToken())
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect(({ body }) => {
        body.data.map((i) => {
          i.options.map((j) => {
            delete j.optionId;
            delete j.optionSequenceNumber;
          });
        });
        expect(expected).toEqual(body.data);
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it(`Test /admin/survey/survey_option_gender_statistics API`, async () => {
    const surveyOpt = await helper.getSurveyOption(surveyId);
    const expected = [
      {
        male: {
          TeenagerPercentage: 0,
          TwentyPercentage: 0,
          ThirtyPercentage: 100,
          FourtyPercentage: 0,
          FiftyPercentage: 0,
          SixtyPlusPercentage: 0,
        },
      },
      {
        female: {
          TeenagerPercentage: 0,
          TwentyPercentage: 0,
          ThirtyPercentage: 0,
          FourtyPercentage: 0,
          FiftyPercentage: 0,
          SixtyPlusPercentage: 0,
        },
      },
    ];
    await request(server)
      .get(
        `/api/admin/survey/survey_option_gender_statistics?surveyId=${surveyId}&optionId=${surveyOpt?.uuid}`,
      )
      .set('Authorization', helper.getAccessToken())
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toEqual(expected);
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it(`Test admin/survey/filterData`, async () => {
    const expected = { sotsGrades: ['C'] };
    await request(server)
      .get('/api/admin/survey/filterData')
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toEqual(expected);
      });
  });

  it(`Test admin/survey`, async () => {
    const payload = {
      userId: user.uuid,
      type: 'single',
      sots: [sot.uuid],
      startingDate: 1675051291,
      endingDate: 1685051291,
      limitedParticipants: true,
      participantsCount: 10,
      rewardeesCount: 5,
      rewardAmount: 600,
      email: user.email,
      question: 'How was the food of shnjen Restaurant?',
      options: [
        {
          name: 'Normal',
          description: 'This is test description',
          colour: '#DF6GTYH',
        },
        {
          name: 'Moderate',
          description: 'This is test description',
          colour: '#DF6GTYG',
        },
      ],
      previewComments: true,
    };
    await request(server)
      .post('/api/admin/survey')
      .set('Authorization', helper.getAccessToken())
      .send(payload)
      .expect(({ body }) => {
        expect(body.data).toBeDefined();
      });
  });

  it(`Test admin/survey/manage_survey/list`, async () => {
    const expected = {
      applicantName: 'Test User Name',
      applicantCompany: 'Dummy Company',
      applicantEmail: 'test_fingerate_admin_helper@yopmail.com',
      applicantPhoneNumber: '03001234567',
      country: 'Korea',
      surveyCountry: 'Korea',
      status: 'in_progress'
    }
    await request(server)
      .get(`/api/admin/survey/manage_survey/list`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        const { createdAt, uuid, ...otherData } = body.data.records[0];
        expect(otherData).toEqual(expected);
      });
  });

  it(`Test admin/survey/manage_survey/id/:uuid`, async () => {
    const expected = {
      applicantName: 'Test User Name',
      applicantCompany: 'Dummy Company',
      applicantEmail: 'test_fingerate_admin_helper@yopmail.com',
      applicantPhoneNumber: '03001234567',
      status: SilverBellRequestStatus.IN_PROGRESS
    }
    await request(server)
      .get(`/api/admin/survey/manage_survey/id/${silverBell.uuid}`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        const { createdAt, ...otherData } = body.data;
        expect(otherData).toEqual(expected)
      });
  });

  it(`Test admin/survey/manage_survey/:uuid`, async () => {
    await request(server)
      .patch(`/api/admin/survey/manage_survey/${silverBell.uuid}`)
      .set('Authorization', helper.getAccessToken())
      .send({
        status: SilverBellRequestStatus.APPROVED
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS)
      });
  });

  afterAll(async () => {
    await helper.clearDB();
    await app.close();
  });
});
