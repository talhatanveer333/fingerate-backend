export interface ISomUserListFilters {
  email: string;
  nickName: string;
  phoneNumber: string;
}

export interface ISomUserHistoryFilters {
  type: string;
  startDate: string;
  endDate: string;
}
export interface ISomStatsDataObject {
  totalSOM: number;
  totalPurchasedSOM: number;
  totalRewardSOM: number;
  graphSOM: Array<ISomGraphObject>;
}

export interface ISomGraphObject {
  year: number,
  month: number,
  rewardedSOM: number,
  purchasedSOM: number
}
