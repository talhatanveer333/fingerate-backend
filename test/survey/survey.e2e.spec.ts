import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppHelper } from '../app.helper';
import { AppModule } from '../../src/modules/main/app.module';
import request from 'supertest';
import { CoinGeckoServiceMock, ExchangeServiceMock, LoggerMock, MailerMock, S3Mock, SotDataMock } from '../mocks/mocks';
import { LoggerService } from '../../src/utils/logger/logger.service';
import { ResponseMessage } from '../../src/utils/enum';
import { MailService } from '../../src/utils/mailer/mail.service';
import dayjs from 'dayjs';
import { S3Service } from '../../src/utils/s3/s3.service';
import { RegisterSurveyDto } from '../../src/modules/survey/common/survey.dtos';
import { SurveyStatus } from '../../src/modules/survey/common/survey.enums';
import { SotDataService } from '../../src/modules/sot/sot.data.service';
import { JobEvents } from '../../src/modules/sot/common/sot.enums';
import { WorkerProcessor } from '../../src/modules/worker/worker.processor';
import { ExchangeService } from '../../src/utils/currencyconverter/exchange.service';
import { CoinGeckoMarket } from '../../src/utils/currencyconverter/coingecko.service';

describe('Fingerate survey test', () => {
  let app: INestApplication;
  let helper: AppHelper;
  let server: any;
  let surveyId: string;
  let sot: any;
  let mediaId: string;
  let job: any = {};
  let workerProcessor: WorkerProcessor;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue(MailerMock)
      .overrideProvider(S3Service)
      .useValue(S3Mock)
      .overrideProvider(LoggerService)
      .useValue(LoggerMock)
      .overrideProvider(SotDataService)
      .useValue(SotDataMock)
      .overrideProvider(ExchangeService)
      .useValue(ExchangeServiceMock)
      .overrideProvider(CoinGeckoMarket)
      .useValue(CoinGeckoServiceMock)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    helper = new AppHelper(app);
    await helper.init();
    workerProcessor = app.get(WorkerProcessor);

    helper.startTestWebSocketServer();
    server = app.getHttpServer();
  });

  it('Test upload/upload_image API', async () => {
    await request(server)
      .post(`/api/media/upload_image`)
      .set('Authorization', helper.getAccessToken())
      .attach('image', `${__dirname}/../download.png`)
      .expect(200)
      .expect(({ body }) => {
        mediaId = body.data.key;
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it(`Test survey/add_survey_email API`, async () => {
    const expectedObj = { verified: true, emailSent: false };
    await request(server)
      .post(`/api/survey/add_survey_email`)
      .set('Authorization', helper.getAccessToken())
      .send({ email: 'testuser@yopmail.com' })
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toEqual(expectedObj);
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it('Test survey/register_survey API', async () => {
    const user = await helper.getUserByEmail('testuser@yopmail.com');
    await helper.initializeWallet(user);
    sot = await helper.createSot();
    const addSurveyInfo: RegisterSurveyDto = {
      type: 'single',
      sots: [`${sot.uuid}`],
      startingDate: dayjs().add(10, 'minutes').unix(),
      endingDate: dayjs().add(20, 'minutes').unix(),
      limitedParticipants: true,
      participantsCount: 10,
      rewardeesCount: 5,
      rewardAmount: 500,
      email: 'testuser@yopmail.com',
      question: 'how was the food',
      options: [
        {
          name: 'good',
          description: 'was it good',
          colour: '#DF6GTYH',
          image: mediaId,
        },
        {
          name: 'moderate',
          description: 'was it moderate',
          colour: '#DF6GTYH',
          image: mediaId,
        },
      ],
      previewComments: true,
    };
    await request(server)
      .post(`/api/survey/register_survey`)
      .set('Authorization', helper.getAccessToken())
      .send(addSurveyInfo)
      .expect(200)
      .expect(({ body }) => {
        surveyId = body.data;
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it(`Test survey/add_silver_bell_request API`, async () => {
    const payload = {
      applicantName: 'fingerateUser',
      applicantEmail: 'fingerateuser@yopmail.com',
      surveyCountry: 'Korea South',
      applicantPhoneNumber: '+923135472100',
      country: 'Pakistan',
    };
    await request(server)
      .post(`/api/survey/add_silver_bell_request`)
      .set('Authorization', helper.getAccessToken())
      .set('Content-Type', 'application/json')
      .send(payload)
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it(`Test survey/survey_receipt/:surveyId API`, async () => {
    const expected = {
      totalPaymentAmount: 2760,
      mySom: 5000,
      serveyRequestFee: 10,
      totalRewardAmount: 2500,
      rewardAmountPerDay: 2500,
      rewardDistributionFee: 250,
      rewardDistributionFeePerday: 250,
      days: 1,
      serveyRequestFeePerDay: 10,
    };
    await request(server)
      .get(`/api/survey/survey_receipt/${surveyId}`)
      .set('Authorization', helper.getAccessToken())
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toEqual(expected);
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it(`Test survey/requested_list API`, async () => {
    const expected = [
      {
        question: 'how was the food',
        status: 'disabled',
        sots: ['Seoul South Korea'],
      },
    ];
    await request(server)
      .get(`/api/survey/requested_list`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        delete body.data.surveys[0].startingDate,
          delete body.data.surveys[0].endingDate,
          delete body.data.surveys[0].uuid,
          expect(body.data.surveys).toEqual(expected);
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it(`Test survey/submit_participation/:surveyId API`, async () => {
    const survey = await helper.getSurveyById(surveyId);
    await helper.createUser('participate@yopmail.com');
    await helper.login('participate@yopmail.com', 'Test!234');
    if (survey) {
      survey.status = SurveyStatus.ONGOING;
      await helper.updateSurvey(survey);
    }
    const surveyOpt = await helper.getSurveyOption(survey);
    await request(server)
      .post(`/api/survey/submit_participation/${surveyId}`)
      .set('Authorization', helper.getAccessToken())
      .send({ optionId: surveyOpt?.uuid })
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it(`Test survey/add_comment/:surveyId API`, async () => {
    await request(server)
      .post(`/api/survey/add_comment/${surveyId}`)
      .set('Authorization', helper.getAccessToken())
      .send({ body: 'test' })
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it(`Test survey/toggle_like_comment/:surveyId API`, async () => {
    const surveyComment = await helper.getSurveyCommentById(surveyId);
    await request(server)
      .post(
        `/api/survey/toggle_like_comment/${surveyComment?.surveyComment.uuid}`,
      )
      .set('Authorization', helper.getAccessToken())
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it(`Test survey/survey_comments/:surveyId API`, async () => {
    const expected = [
      {
        likes: 1,
        body: 'test',
        optionName: 'good',
        nickName: null,
        canDelete: true,
        isLiked: true,
        profileImage: null,
        avatar: "{\"Avatar\":\"female\",\"Hairs\":\"long\",\"Top\":\"nosleves\",\"Bottom\":\"\",\"Shoes\":\"long\",\"Skintone\":\"white\"}",
        optionColour: '#DF6GTYH',
      },
    ];
    await request(server)
      .get(`/api/survey/survey_comments/${surveyId}`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        body.data.comments.map((i) => {
          delete i.uuid, delete i.createdAt;
        });
        expect(body.data.comments).toEqual(expected);
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it(`Test survey/delete_comment/:surveyId API`, async () => {
    const surveyComment = await helper.getSurveyCommentById(surveyId);
    await request(server)
      .post(`/api/survey/delete_comment/${surveyComment?.surveyComment.uuid}`)
      .set('Authorization', helper.getAccessToken())
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect(({ body }) => {
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it(`Test survey/survey_detail/:surveyId API`, async () => {
    const expected = {
      question: 'how was the food',
      participantsCount: 10,
      rewardAmount: 500,
      rewardeesCount: 5,
      type: 'single',
      participationCount: 1,
      previewComments: true,
      options: [
        {
          name: 'good',
          description: 'was it good',
          image: '2022-08-29T09:43:03.528Z_xHsUyWI.png',
          sequenceNumber: 1,
        },
        {
          name: 'moderate',
          description: 'was it moderate',
          image: '2022-08-29T09:43:03.528Z_xHsUyWI.png',
          sequenceNumber: 2,
        },
      ],
      sots: ['Seoul South Korea'],
      status: 'ongoing',
      participated: true
    };

    await request(server)
      .get(`/api/survey/survey_detail/${surveyId}`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        const { surveyId, startingDate, participationOption, endingDate, ...survey } = body.data;
        survey.options.map((i) => delete i.id);
        expect(expected).toEqual(survey);
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it(`Test survey/participation_list API`, async () => {
    const expected = [
      {
        question: 'how was the food',
        status: 'ongoing',
        sots: ['Seoul South Korea'],
      },
    ];
    await request(server)
      .get(`/api/survey/participation_list`)
      .set('Authorization', helper.getAccessToken())
      .expect(200)
      .expect(({ body }) => {
        delete body.data.surveys[0].startingDate,
          delete body.data.surveys[0].endingDate,
          delete body.data.surveys[0].uuid,
          expect(body.data.surveys).toEqual(expected);
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it(`Test survey/chart_by_gender/:surveyId API`, async () => {
    const expected = [
      {
        name: 'good',
        colour: '#DF6GTYH',
        totalCount: 1,
        maleCount: 1,
        femaleCount: 0,
        femalePercentage: 0,
        sequenceNumber: 1,
        malePercentage: 100,
      },
      {
        name: 'moderate',
        colour: '#DF6GTYH',
        totalCount: 0,
        maleCount: 0,
        femaleCount: 0,
        femalePercentage: 0,
        sequenceNumber: 2,
        malePercentage: 0,
      },
    ];

    await request(server)
      .get(`/api/survey/chart_by_gender/${surveyId}`)
      .set('Authorization', helper.getAccessToken())
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect(({ body }) => {
        body.data.map((i) => delete i.uuid);
        expect(expected).toEqual(body.data);
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it(`Test survey/total_participation_chart/:surveyId API`, async () => {
    const expected = [
      {
        percentage: 100,
        optionName: 'good',
        optionColour: '#DF6GTYH',
        optionSequenceNumber: 1
      },
      {
        optionName: 'moderate',
        percentage: 0,
        optionColour: '#DF6GTYH',
        optionSequenceNumber: 2
      },
    ];

    await request(server)
      .get(`/api/survey/total_participation_chart/${surveyId}`)
      .set('Authorization', helper.getAccessToken())
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect(({ body }) => {
        delete body.data.optionPercentage[0].optionId,
          delete body.data.optionPercentage[1].optionId,
          expect(body.data.optionPercentage).toEqual(expected);
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it(`Test survey/chart_by_age/:surveyId API`, async () => {
    const expected = [
      {
        age: 10,
        options: [
          {
            optionName: 'good',
            optionPercentage: 0,
            optionColour: '#DF6GTYH',
            optionSequenceNumber: 1
          },
          {
            optionName: 'moderate',
            optionPercentage: 0,
            optionColour: '#DF6GTYH',
            optionSequenceNumber: 2
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
            optionSequenceNumber: 1
          },
          {
            optionName: 'moderate',
            optionPercentage: 0,
            optionColour: '#DF6GTYH',
            optionSequenceNumber: 2
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
            optionSequenceNumber: 1
          },
          {
            optionName: 'moderate',
            optionPercentage: 0,
            optionColour: '#DF6GTYH',
            optionSequenceNumber: 2
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
            optionSequenceNumber: 1
          },
          {
            optionName: 'moderate',
            optionPercentage: 0,
            optionColour: '#DF6GTYH',
            optionSequenceNumber: 2
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
            optionSequenceNumber: 1

          },
          {
            optionName: 'moderate',
            optionPercentage: 0,
            optionColour: '#DF6GTYH',
            optionSequenceNumber: 2
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
            optionSequenceNumber: 1
          },
          {
            optionName: 'moderate',
            optionColour: '#DF6GTYH',
            optionPercentage: 0,
            optionSequenceNumber: 2
          },
        ],
      },
    ];
    await request(server)
      .get(`/api/survey/chart_by_age/${surveyId}`)
      .set('Authorization', helper.getAccessToken())
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect(({ body }) => {
        body.data.map((i) => {
          i.options.map((j) => delete j.optionId);
        });
        expect(expected).toEqual(body.data);
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it(`Test survey/chart_by_option API`, async () => {
    const survey = await helper.getSurveyById(surveyId);
    const surveyOpt = await helper.getSurveyOption(survey);
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
        `/api/survey/chart_by_option?surveyId=${surveyId}&optionId=${surveyOpt?.uuid}`,
      )
      .set('Authorization', helper.getAccessToken())
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toEqual(expected);
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });

  it(`Test End Survey`, async () => {
    job.data = { surveyId };
    await workerProcessor.endSurvey(job).then((result) => {
      expect(result).toEqual(JobEvents.Completed);
    });
  });

  it(`Test survey/list_by_sotId/:sotId API`, async () => {
    const expected = {
      rewardeesCount: 5,
      rewardAmount: 500,
      question: 'how was the food',
      allowedparticipants: 10,
      type: 'single',
      totalparticipations: 1
    }
    await request(server)
      .get(
        `/api/survey/list_by_sotId/${sot?.uuid}?page=1&pageSize=2`,
      )
      .set('Authorization', helper.getAccessToken())
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect(({ body }) => {
        const { surveyid, startingDate, endingDate, ...received } = body.data.surveys[0];
        expect(received).toEqual(expected);
        expect(body.message).toEqual(ResponseMessage.SUCCESS);
      });
  });



  afterAll(async () => {
    await helper.clearDB();
    helper.stopTestWebSocketServer();
    await app.close();
  });
});
