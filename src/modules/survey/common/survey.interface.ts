import { Survey } from '../survey.entity';
import { User } from '../../user/user.entity';
import { UserWallet } from 'modules/user/userwallet.entity';
import { RewardType } from 'modules/payment/common/payment.enums';
export interface IOption {
  name?: string;
  description: string;
  colour: string;
  image: string;
}

export interface IOptionResult {
  OptionId: string;
  OptionName: string;
  OptionColour: string;
  OptionCount: number;
  sequenceNumber: number;
}

export interface IRewardDistribution {
  users: User[];
  survey: Survey;
}

export interface IRewardPayload {
  amount: number;
  survey?: string;
  wallet: UserWallet;
  type: RewardType;
}
