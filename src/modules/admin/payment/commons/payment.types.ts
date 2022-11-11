export interface IPaymentGraphStatsFilters {
  startDate: number;
  endDate: number;
}

export interface IPaymentGraphStatsReturnObject {
  totalOfNewPayments: number;
  graphData: Array<any>;
}
