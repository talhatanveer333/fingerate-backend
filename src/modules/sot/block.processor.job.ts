import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { LoggerService } from '../../utils/logger/logger.service';
import { SotService } from './sot.service';
import { BlockQueue, JobEvents } from './common/sot.enums';
import { SotDataService } from './sot.data.service';

@Processor(BlockQueue.BLOCK)
export class BlockProcessor {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly sotService: SotService,
    private readonly sotDataService: SotDataService,
  ) {
    this.loggerService.setContext('BlockProcessor');
  }
  /**
   * Process a block as job from redis queue
   *
   * @param job
   * @returns
   */
  @Process(BlockQueue.BLOCK)
  public handleBlock(job: Job) {
    return new Promise<string>(async (resolve, reject) => {
      try {
        this.loggerService.log(
          `Block Processing started: ${job.data.event.blockNumber}`,
        );
        const url = await this.sotDataService.getTokenMetaData(
          job.data.event.returnValues.tokenId,
        );
        const owner = await this.sotDataService.getTokenOwner(
          job.data.event.returnValues.tokenId,
        );
        const time = await this.sotDataService.getTransactionTime(
          job.data.event.blockNumber,
        );
        await this.sotService.addSotData(url, time, owner);
        await this.sotService.updateLastNftBlock(job.data.event.blockNumber);
        this.loggerService.log(
          `Block Processing completed: ${job.data.event.blockNumber}`,
        );
        resolve(JobEvents.Completed);
      } catch (err) {
        this.loggerService.error(err);
        reject(err);
      }
    });
  }
}
