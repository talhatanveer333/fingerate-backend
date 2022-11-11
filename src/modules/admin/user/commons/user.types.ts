export interface IUserListFilters {
  email: string;
  nickName: string;
  status: string;
  startDate: string;
  endDate: string;
}

export interface IGraphStatsFilters {
  startDate: string;
  endDate: string;
}

export interface IGraphDataReturnObject {
  memberShipWithdrawls: Array<any>;
  newMemberShips: Array<any>;
  cumulativeSubscribers: number;
  filteredCumulativeSubscribers: number;
}
