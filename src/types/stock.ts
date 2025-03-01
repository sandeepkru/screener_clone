export interface Stock {
  symbol: string;
  name: string;
  description: string;
  market_cap: number;
  exchange: string;
  industry: string;
  website: string;
  logo: string;
  employees: number;
  ceo: string;
  country: string;
  ipo_date: string;
}

export interface StockPrices {
  daily: { date: string; price: number }[];
  weekly: { date: string; price: number }[];
  monthly: { date: string; price: number }[];
  yearly: { date: string; price: number }[];
  fiveYear: { date: string; price: number }[];
}

export type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y'; 