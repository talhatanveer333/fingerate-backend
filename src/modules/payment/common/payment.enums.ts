export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}
export enum PaymentType {
  SURVEY = 'survey',
  RECHARGE = 'recharge',
  PURCHASE = 'purchase',
  REWARD = 'reward',
}

export enum TransactionType {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum PaymentCurrrency {
  DOLLAR = 'USD',
  KOREAN_WAN = 'KRW',
}

export enum CoinGeckoCurrrency {
  MSOT = 'btour-chain',
}

export enum RewardType {
  ATTENDANCE = 'attendance',
  SURVEY_PARTICIPATION = 'survey_participation',
  INFO_COMPLETION = 'info_completion',
  DAILY_SURVEY_PARTICIPATION = 'daily_survey_participation',
}

export enum AddRewardType {
  ATTENDANCE = 'attendance',
  SURVEY_PARTICIPATION = 'survey_participation',
  REFERRAL = 'referral',
}

export enum EncDecMethod {
  ENCRYPT = 'encrypt',
  DECRYPT = 'decrypt',
}

export enum ProfitEnum {
  PENDING = 'pending',
  COMPLETED = 'completed',
}
