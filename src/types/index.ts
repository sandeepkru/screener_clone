export interface Company {
  symbol: string;
  name: string;
  description?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  employees?: number;
  ceo?: string;
  website?: string;
  exchange?: string;
}

export interface StockPrice {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockData {
  company: Company;
  prices: StockPrice[];
  dailyPrices: StockPrice[];
  weeklyPrices: StockPrice[];
  monthlyPrices: StockPrice[];
  yearlyPrices: StockPrice[];
}

export interface SearchResult {
  symbol: string;
  name: string;
}

export type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
} 