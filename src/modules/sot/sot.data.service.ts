import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { LoggerService } from '../../utils/logger/logger.service';
import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { BlockQueue, JobAttempts } from './common/sot.enums';
const { abi } = require('./sotabi');
import { SotService } from './sot.service';

@Injectable()
export class SotDataService {
  private readonly web3: Web3;
  private sotContract: Contract;
  constructor(
    private readonly sotService: SotService,
    @InjectQueue(BlockQueue.BLOCK)
    private readonly blockQueue: Queue,
    private readonly loggerService: LoggerService,
  ) {
    this.loggerService.setContext('SotDataService');
    this.web3 = new Web3(`${process.env.WEB_SOCKET_LINK}`);
    this.sotContract = new this.web3.eth.Contract(
      abi.abi,
      process.env.CONTRACT_ADDRESS,
    );
    (async () => {
      const lastBlock = await this.getLastNftBlock();
      await this.syncSotdata(lastBlock);
    })();
  }

  /**
   * get Last Nft Block
   *
   * @returns
   */
  public async getLastNftBlock() {
    return await this.sotService.getLastNftBlock();
  }

  /**
   * update Last Nft Block
   *
   * @param blockNumber :number
   * @returns
   */
  public async updateLastNftBlock(blockNumber: number) {
    return await this.sotService.updateLastNftBlock(blockNumber);
  }

  /**
   * sync Sot data
   *
   * @param blockNumber :number
   * @returns
   */
  async syncSotdata(blockNumber: number) {
    const options = {
      reconnect: {
        auto: true,
        delay: 5000,
        maxAttempts: 10,
        onTimeout: false,
      },
      address: [`${process.env.OWNER_PUBLIC_KEY}`],
      fromBlock: Number(blockNumber) + 1, // Number || "earliest" || "pending" || "latest"
    };

    this.sotContract.events
      .Transfer(options)
      .on('data', async (event) => {
        try {
          if (event) {
            this.loggerService.log(`New Block In Queue: ${event.blockNumber}`);
            await this.addBlock(event);
          }
        } catch (err) {
          this.loggerService.error(err);
        }
      })
      .on('disconnect', async (event) => {
        this.loggerService.log('Contract Socket Disconnect');
        const lastBlock = await this.getLastNftBlock();
        await this.syncSotdata(lastBlock);
      })
      .on('error', (err) => {
        this.loggerService.error('Contract Socket Connection Error');
      });
  }

  /**
   * Get Token Metadata From token Id
   *
   * @param tokenId
   * @returns
   */
  async getTokenMetaData(tokenId: string): Promise<string> {
    return await this.sotContract.methods
      .getTokenMetaData(Number(tokenId))
      .call();
  }

  /**
   * Get Token Owner From Token Id
   *
   * @param tokenId
   * @returns
   */
  async getTokenOwner(tokenId: string): Promise<string> {
    return await this.sotContract.methods.ownerOf(Number(tokenId)).call();
  }

  /**
   * Get Transaction Time
   *
   * @param blockNumber:number
   * @returns blockDetail
   */
  async getTransactionTime(blockNumber: number): Promise<number> {
    const blockDetail = await this.web3.eth.getBlock(blockNumber);
    return Number(blockDetail.timestamp);
  }

  /**
   * Add block to block queue
   * 
   * @param event:any
   * @return 
   */
  async addBlock(event: any) {
    await this.blockQueue.add(
      BlockQueue.BLOCK,
      {
        event,
      },
      {
        removeOnComplete: true,
        attempts: JobAttempts.THREE,
      },
    );
    return;
  }
}
