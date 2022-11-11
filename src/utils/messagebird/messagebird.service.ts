import initMB, { MessageBird, Message } from 'messagebird';
import { Injectable, HttpException } from '@nestjs/common';
import { ResponseCode, ResponseMessage } from '../../utils/enum';

@Injectable()
export class MessageBirdService {
  private messagebird: MessageBird;
  constructor() {
    this.messagebird = initMB(`${process.env.MESSAGE_BIRD_API_KEY}`);
  }
  async messageCreate(number: string, token: string): Promise<Message> {
    return new Promise<Message>(async (resolve, reject) => {
      this.messagebird.messages.create(
        {
          originator: 'Fingerate',
          recipients: [number],
          body: `Your verification code: ${token}`,
        },
        (err, res) => {
          if (err) {
            return reject(
              new HttpException(
                {
                  statusCode: ResponseCode.INTERNAL_ERROR,
                  message: ResponseMessage.SENDING_OTP_FAILED,
                },
                ResponseCode.BAD_REQUEST,
              ),
            );
          }
          return resolve(res);
        },
      );
    });
  }
}
