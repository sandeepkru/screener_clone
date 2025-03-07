import axios from 'axios';
// import { format, subDays, subMonths, subYears } from 'date-fns';
import { ApiResponse, Company, StockData, StockPrice, TimeRange as ApiTimeRange } from '@/types';
import cacheService from '../cache/cacheService';

// Define the Stock and StockPrices types here since there's an issue with importing them
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
  threeMonth: { date: string; price: number }[];
  yearly: { date: string; price: number }[];
  fiveYear: { date: string; price: number }[];
}

export type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y';

// Use environment variables for API configuration
const POLYGON_API_KEY = process.env.NEXT_PUBLIC_POLYGON_API_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.polygon.io';

// Check if API key is available
if (!POLYGON_API_KEY) {
  console.warn('POLYGON_API_KEY is not set. API calls will fail. Please set NEXT_PUBLIC_POLYGON_API_KEY in your environment variables.');
}

// Cache TTLs in seconds
const CACHE_TTL = {
  TICKER_DETAILS: 7 * 24 * 60 * 60, // 7 days
  DAILY_PRICES: 24 * 60 * 60,       // 1 day
  WEEKLY_PRICES: 2 * 24 * 60 * 60,  // 2 days
  MONTHLY_PRICES: 7 * 24 * 60 * 60, // 7 days
  YEARLY_PRICES: 30 * 24 * 60 * 60, // 30 days
};

// Create axios instance with base configuration
const api = axios.create({
  baseURL: BASE_URL,
  params: {
    apiKey: POLYGON_API_KEY,
  },
  // Add timeout to prevent hanging requests
  timeout: 10000,
});

// Add request interceptor for logging
api.interceptors.request.use(config => {
  console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

// Add response interceptor for logging
api.interceptors.response.use(
  response => {
    console.log(`API Response: ${response.status} ${response.statusText}`);
    return response;
  },
  error => {
    console.error('API Error:', error.message);
    return Promise.reject(error);
  }
);

// Mock data for development (remove in production)
const mockCompanies: Company[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    description: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    marketCap: 2800000000000,
    employees: 164000,
    ceo: 'Tim Cook',
    website: 'https://www.apple.com',
    exchange: 'NASDAQ',
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    description: 'Microsoft Corporation develops, licenses, and supports software, services, devices, and solutions worldwide.',
    sector: 'Technology',
    industry: 'Software—Infrastructure',
    marketCap: 2500000000000,
    employees: 181000,
    ceo: 'Satya Nadella',
    website: 'https://www.microsoft.com',
    exchange: 'NASDAQ',
  },
  // Add more mock companies as needed
];

// Define proper types for API responses
type PolygonPriceResult = {
  t: number; // timestamp
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
};

type PolygonCompanyResult = {
  ticker: string;
  name: string;
  description?: string;
  sic_description?: string;
  industry?: string;
  market_cap?: number;
  total_employees?: number;
  ceo?: string;
  homepage_url?: string;
  primary_exchange?: string;
};

// Get company details
export const getCompanyDetails = async (symbol: string): Promise<ApiResponse<Company>> => {
  try {
    // Check cache first
    const cacheKey = `stock:details:${symbol}`;
    const cachedData = await cacheService.get<Company>(cacheKey);
    
    if (cachedData) {
      console.log(`Cache hit for stock details: ${symbol}`);
      return { success: true, data: cachedData };
    }
    
    console.log(`Cache miss for stock details: ${symbol}, fetching from API`);
    
    // Use the actual API
    const response = await api.get(`/v3/reference/tickers/${symbol}`);
    
    if (response.data && response.data.results) {
      const apiCompany = response.data.results;
      
      const company: Company = {
        symbol: apiCompany.ticker || symbol,
        name: apiCompany.name || '',
        description: apiCompany.description || '',
        sector: apiCompany.sic_description || '',
        industry: apiCompany.industry || '',
        marketCap: apiCompany.market_cap || 0,
        employees: apiCompany.total_employees || 0,
        ceo: apiCompany.ceo || '',
        website: apiCompany.homepage_url || '',
        exchange: apiCompany.primary_exchange || '',
      };
      
      // Cache the result
      await cacheService.set(cacheKey, company, CACHE_TTL.TICKER_DETAILS);
      
      return { success: true, data: company };
    }
    
    // Fallback to mock data if API doesn't return expected results
    const mockCompany = mockCompanies.find(c => c.symbol === symbol.toUpperCase());
    
    if (!mockCompany) {
      return { success: false, error: 'Company not found' };
    }
    
    return { success: true, data: mockCompany };
  } catch (error) {
    console.error('Error fetching company details:', error);
    
    // Fallback to mock data on error
    const mockCompany = mockCompanies.find(c => c.symbol === symbol.toUpperCase());
    
    if (mockCompany) {
      return { success: true, data: mockCompany };
    }
    
    return { success: false, error: 'Failed to fetch company details' };
  }
};

// Get stock price data
export const getStockPriceData = async (
  symbol: string,
  timeRange: ApiTimeRange
): Promise<ApiResponse<StockPrice[]>> => {
  try {
    // Check cache first
    const cacheKey = `stock:prices:${symbol}:${timeRange}`;
    const cachedData = await cacheService.get<StockPrice[]>(cacheKey);
    
    if (cachedData) {
      console.log(`Cache hit for stock prices: ${symbol} (${timeRange})`);
      return { success: true, data: cachedData };
    }
    
    console.log(`Cache miss for stock prices: ${symbol} (${timeRange}), fetching from API`);
    
    // Set up date range based on timeRange
    const now = new Date();
    const startDate = new Date(now);
    let multiplier = 1;
    let timespan = 'day';
    
    switch (timeRange) {
      case '1D':
        startDate.setDate(now.getDate() - 1);
        multiplier = 5;
        timespan = 'minute';
        break;
      case '1W':
        startDate.setDate(now.getDate() - 7);
        multiplier = 1;
        timespan = 'hour';
        break;
      case '1M':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '1Y':
        startDate.setFullYear(now.getFullYear() - 1);
        multiplier = 1;
        timespan = 'week';
        break;
      case '5Y':
        startDate.setFullYear(now.getFullYear() - 5);
        multiplier = 1;
        timespan = 'month';
        break;
    }
    
    const formattedStartDate = startDate.toISOString().split('T')[0];
    const formattedEndDate = now.toISOString().split('T')[0];
    
    try {
      // Use the actual API
      const response = await api.get(
        `/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${formattedStartDate}/${formattedEndDate}`
      );
      
      if (response.data && response.data.results) {
        const prices: StockPrice[] = response.data.results.map((item: PolygonPriceResult) => ({
          timestamp: item.t,
          open: item.o,
          high: item.h,
          low: item.l,
          close: item.c,
          volume: item.v
        }));
        
        console.log(`Transformed ${prices.length} price points for ${symbol} (${timeRange})`);
        
        // Cache the result
        const cacheTtl = timeRange === '1D' ? CACHE_TTL.DAILY_PRICES : 
                         timeRange === '1W' ? CACHE_TTL.WEEKLY_PRICES :
                         timeRange === '1M' || timeRange === '3M' ? CACHE_TTL.MONTHLY_PRICES :
                         CACHE_TTL.YEARLY_PRICES;
        
        await cacheService.set(cacheKey, prices, cacheTtl);
        
        return { success: true, data: prices };
      }
      
      // No price data found, log and generate mock data instead of throwing an error
      console.log(`No price data found for ${symbol} (${timeRange}), using mock data`);
      
      // Generate mock data as fallback
      const days = timeRange === '1D' ? 1 : 
                  timeRange === '1W' ? 7 : 
                  timeRange === '1M' ? 30 : 
                  timeRange === '3M' ? 90 : 
                  timeRange === '1Y' ? 365 : 1825; // 5 years = 1825 days
      
      const mockPrices = generateMockPrices(symbol, timeRange, days);
      console.log(`Generated ${mockPrices.length} mock price points for ${symbol} (${timeRange})`);
      
      // Cache the mock result
      const cacheTtl = timeRange === '1D' ? CACHE_TTL.DAILY_PRICES : 
                       timeRange === '1W' ? CACHE_TTL.WEEKLY_PRICES :
                       timeRange === '1M' || timeRange === '3M' ? CACHE_TTL.MONTHLY_PRICES :
                       CACHE_TTL.YEARLY_PRICES;
      
      await cacheService.set(cacheKey, mockPrices, cacheTtl);
      
      return { success: true, data: mockPrices };
    } catch (apiError) {
      console.error(`API error for ${symbol} (${timeRange}):`, apiError);
      console.log(`Falling back to mock data for ${symbol} (${timeRange})`);
      
      // Generate mock data as fallback
      const days = timeRange === '1D' ? 1 : 
                  timeRange === '1W' ? 7 : 
                  timeRange === '1M' ? 30 : 
                  timeRange === '3M' ? 90 : 
                  timeRange === '1Y' ? 365 : 1825; // 5 years = 1825 days
      
      const mockPrices = generateMockPrices(symbol, timeRange, days);
      console.log(`Generated ${mockPrices.length} mock price points for ${symbol} (${timeRange})`);
      
      // Cache the result
      const cacheTtl = timeRange === '1D' ? CACHE_TTL.DAILY_PRICES : 
                       timeRange === '1W' ? CACHE_TTL.WEEKLY_PRICES :
                       timeRange === '1M' || timeRange === '3M' ? CACHE_TTL.MONTHLY_PRICES :
                       CACHE_TTL.YEARLY_PRICES;
      
      await cacheService.set(cacheKey, mockPrices, cacheTtl);
      
      return { success: true, data: mockPrices };
    }
  } catch (error) {
    console.error(`Error fetching stock price data for ${symbol} (${timeRange}):`, error);
    
    // Generate mock data as fallback
    const days = timeRange === '1D' ? 1 : 
                timeRange === '1W' ? 7 : 
                timeRange === '1M' ? 30 : 
                timeRange === '3M' ? 90 : 
                timeRange === '1Y' ? 365 : 1825; // 5 years = 1825 days
    
    const prices = generateMockPrices(symbol, timeRange, days);
    console.log(`Generated ${prices.length} mock price points for ${symbol} (${timeRange}) after error`);
    
    // Cache the result
    const cacheTtl = timeRange === '1D' ? CACHE_TTL.DAILY_PRICES : 
                     timeRange === '1W' ? CACHE_TTL.WEEKLY_PRICES :
                     timeRange === '1M' || timeRange === '3M' ? CACHE_TTL.MONTHLY_PRICES :
                     CACHE_TTL.YEARLY_PRICES;
    
    const cacheKey = `stock:prices:${symbol}:${timeRange}`;
    await cacheService.set(cacheKey, prices, cacheTtl);
    
    return { success: true, data: prices };
  }
};

// Get all stock data for a symbol
export const getStockData = async (symbol: string): Promise<ApiResponse<StockData>> => {
  try {
    const companyResponse = await getCompanyDetails(symbol);
    
    if (!companyResponse.success || !companyResponse.data) {
      return { success: false, error: companyResponse.error || 'Company not found' };
    }
    
    const dailyResponse = await getStockPriceData(symbol, '1D');
    const weeklyResponse = await getStockPriceData(symbol, '1W');
    const monthlyResponse = await getStockPriceData(symbol, '1M');
    const yearlyResponse = await getStockPriceData(symbol, '1Y');
    
    if (!dailyResponse.success || !dailyResponse.data) {
      return { success: false, error: dailyResponse.error || 'Failed to fetch price data' };
    }
    
    const stockData: StockData = {
      company: companyResponse.data,
      prices: dailyResponse.data, // Default to daily prices
      dailyPrices: dailyResponse.data || [],
      weeklyPrices: weeklyResponse.data || [],
      monthlyPrices: monthlyResponse.data || [],
      yearlyPrices: yearlyResponse.data || [],
    };
    
    return { success: true, data: stockData };
  } catch (error) {
    console.error('Error fetching stock data:', error);
    return { success: false, error: 'Failed to fetch stock data' };
  }
};

// Search for stocks
export const searchStocks = async (query: string): Promise<ApiResponse<Company[]>> => {
  try {
    if (!query || query.trim() === '') {
      return { success: true, data: mockCompanies.slice(0, 5) };
    }
    
    // Check cache first
    const cacheKey = `stock:search:${query}`;
    const cachedData = await cacheService.get<Company[]>(cacheKey);
    
    if (cachedData) {
      console.log(`Cache hit for stock search: ${query}`);
      return { success: true, data: cachedData };
    }
    
    console.log(`Cache miss for stock search: ${query}, fetching from API`);
    
    try {
      // Use the actual API
      const response = await api.get(`/v3/reference/tickers`, {
        params: {
          search: query,
          active: true,
          sort: 'ticker',
          order: 'asc',
          limit: 10,
        },
      });
      
      if (response.data && response.data.results) {
        const companies: Company[] = response.data.results.map((item: PolygonCompanyResult) => ({
          symbol: item.ticker,
          name: item.name,
          description: '',
          sector: '',
          industry: '',
          marketCap: 0,
          employees: 0,
          ceo: '',
          website: '',
          exchange: item.primary_exchange || '',
        }));
        
        // Cache the result for a shorter time (1 hour)
        await cacheService.set(cacheKey, companies, 60 * 60);
        
        return { success: true, data: companies };
      }
    } catch (apiError) {
      console.error('API error during search:', apiError);
    }
    
    // Fallback to filtering mock data
    const filteredCompanies = mockCompanies.filter(company => 
      company.symbol.toLowerCase().includes(query.toLowerCase()) || 
      company.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);
    
    return { success: true, data: filteredCompanies };
  } catch (error) {
    console.error('Error searching stocks:', error);
    return { success: false, error: 'Failed to search stocks' };
  }
};

// New functions with the enhanced caching

/**
 * Get stock details with enhanced caching
 */
export async function getEnhancedStockDetails(symbol: string): Promise<Stock | null> {
  try {
    // Check cache first
    const cacheKey = `stock:enhanced:details:${symbol}`;
    const cachedData = await cacheService.get<Stock>(cacheKey);
    
    if (cachedData) {
      console.log(`Cache hit for enhanced stock details: ${symbol}`);
      return cachedData;
    }
    
    console.log(`Cache miss for enhanced stock details: ${symbol}, fetching from API`);
    
    const response = await fetch(
      `${BASE_URL}/v3/reference/tickers/${symbol}?apiKey=${POLYGON_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch stock details: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.results) {
      console.error('No results found for stock details:', data);
      return null;
    }

    const stock: Stock = {
      symbol: data.results.ticker,
      name: data.results.name,
      description: data.results.description || '',
      market_cap: data.results.market_cap || 0,
      exchange: data.results.primary_exchange || '',
      industry: data.results.sic_description || '',
      website: data.results.homepage_url || '',
      logo: data.results.branding?.logo_url || '',
      employees: data.results.total_employees || 0,
      ceo: data.results.ceo || '',
      country: data.results.locale || '',
      ipo_date: data.results.list_date || '',
    };
    
    // Cache the result
    await cacheService.set(cacheKey, stock, CACHE_TTL.TICKER_DETAILS);
    
    return stock;
  } catch (error) {
    console.error(`Error fetching enhanced stock details for ${symbol}:`, error);
    return null;
  }
}

/**
 * Get stock prices with enhanced caching
 */
export const getEnhancedStockPrices = async (symbol: string): Promise<StockPrices> => {
  try {
    console.log(`Fetching enhanced stock prices for ${symbol}`);
    
    // Fetch prices for different time ranges
    const dailyPrices = await getStockPriceData(symbol, '1D');
    const weeklyPrices = await getStockPriceData(symbol, '1W');
    const monthlyPrices = await getStockPriceData(symbol, '1M');
    const threeMonthPrices = await getStockPriceData(symbol, '3M');
    const yearlyPrices = await getStockPriceData(symbol, '1Y');
    const fiveYearPrices = await getStockPriceData(symbol, '5Y');
    
    return {
      daily: dailyPrices.data?.map(price => ({
        date: new Date(price.timestamp).toISOString(),
        price: price.close
      })) || [],
      weekly: weeklyPrices.data?.map(price => ({
        date: new Date(price.timestamp).toISOString(),
        price: price.close
      })) || [],
      monthly: monthlyPrices.data?.map(price => ({
        date: new Date(price.timestamp).toISOString(),
        price: price.close
      })) || [],
      threeMonth: threeMonthPrices.data?.map(price => ({
        date: new Date(price.timestamp).toISOString(),
        price: price.close
      })) || [],
      yearly: yearlyPrices.data?.map(price => ({
        date: new Date(price.timestamp).toISOString(),
        price: price.close
      })) || [],
      fiveYear: fiveYearPrices.data?.map(price => ({
        date: new Date(price.timestamp).toISOString(),
        price: price.close
      })) || []
    };
  } catch (error) {
    console.error(`Error fetching enhanced stock prices for ${symbol}:`, error);
    throw error;
  }
};

/**
 * Search for stocks with enhanced caching
 */
export async function getEnhancedSearchStocks(query: string): Promise<Stock[]> {
  try {
    // Check cache first
    const cacheKey = `stock:enhanced:search:${query}`;
    const cachedData = await cacheService.get<Stock[]>(cacheKey);
    
    if (cachedData) {
      console.log(`Cache hit for enhanced stock search: ${query}`);
      return cachedData;
    }
    
    console.log(`Cache miss for enhanced stock search: ${query}, fetching from API`);
    
    const response = await fetch(
      `${BASE_URL}/v3/reference/tickers?search=${query}&active=true&sort=ticker&order=asc&limit=10&apiKey=${POLYGON_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Failed to search stocks: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.results) {
      console.error('No results found for stock search:', data);
      return [];
    }

    const stocks = data.results.map((item: PolygonCompanyResult) => ({
      symbol: item.ticker,
      name: item.name,
      description: '',
      market_cap: 0,
      exchange: item.primary_exchange || '',
      industry: '',
      website: '',
      logo: '',
      employees: 0,
      ceo: '',
      country: '',
      ipo_date: '',
    }));
    
    // Cache the result for a shorter time (1 hour)
    await cacheService.set(cacheKey, stocks, 60 * 60);
    
    return stocks;
  } catch (error) {
    console.error(`Error searching enhanced stocks for "${query}":`, error);
    return [];
  }
}

/**
 * Get popular/trending stocks with enhanced caching
 */
export async function getEnhancedPopularStocks(): Promise<Stock[]> {
  try {
    // Check cache first
    const cacheKey = 'stock:enhanced:popular';
    const cachedData = await cacheService.get<Stock[]>(cacheKey);
    
    if (cachedData) {
      console.log('Cache hit for enhanced popular stocks');
      return cachedData;
    }
    
    console.log('Cache miss for enhanced popular stocks, fetching from API');
    
    // Popular tech stocks
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'NFLX'];
    const stocks: Stock[] = [];
    
    for (const symbol of symbols) {
      const stock = await getEnhancedStockDetails(symbol);
      if (stock) {
        stocks.push(stock);
      }
    }
    
    // Cache the result for 1 day
    await cacheService.set(cacheKey, stocks, 24 * 60 * 60);
    
    return stocks;
  } catch (error) {
    console.error('Error fetching enhanced popular stocks:', error);
    return [];
  }
}

// Add a simple implementation of generateMockPrices
const generateMockPrices = (
  symbol: string, 
  timeRange: ApiTimeRange, 
  count: number
): StockPrice[] => {
  const now = new Date();
  const prices: StockPrice[] = [];
  
  // Use more realistic base prices for popular stocks
  const basePrice = symbol === 'AAPL' ? 180.95 : 
                   symbol === 'MSFT' ? 417.88 : 
                   symbol === 'GOOGL' ? 175.98 : 
                   symbol === 'AMZN' ? 178.75 : 
                   symbol === 'META' ? 474.99 :
                   symbol === 'TSLA' ? 175.22 :
                   symbol === 'NVDA' ? 950.02 :
                   symbol === 'NFLX' ? 605.88 : 100.00;
  
  // Determine time interval based on timeRange
  let interval: number;
  switch(timeRange) {
    case '1D': interval = 5 * 60 * 1000; break; // 5 minutes
    case '1W': interval = 60 * 60 * 1000; break; // 1 hour
    case '1M': case '3M': interval = 24 * 60 * 60 * 1000; break; // 1 day
    case '1Y': interval = 7 * 24 * 60 * 60 * 1000; break; // 1 week
    case '5Y': interval = 30 * 24 * 60 * 60 * 1000; break; // 1 month
    default: interval = 24 * 60 * 60 * 1000; // Default to 1 day
  }
  
  // Create a trend direction for this stock (up, down, or sideways)
  const trendDirection = Math.random() > 0.7 ? -1 : 1; // 70% chance of upward trend
  const volatility = symbol === 'TSLA' || symbol === 'NVDA' ? 0.03 : 0.015; // Higher volatility for some stocks
  
  let currentPrice = basePrice;
  
  for (let i = 0; i < count; i++) {
    const timestamp = now.getTime() - ((count - i - 1) * interval);
    
    // Add some randomness but maintain a general trend
    const randomFactor = volatility * (Math.random() - 0.5); // Random factor between -volatility/2 and +volatility/2
    const trendFactor = (i / count) * volatility * trendDirection; // Gradual trend component
    
    // Update the price with both random movement and trend
    currentPrice = currentPrice * (1 + randomFactor + trendFactor);
    
    // Ensure price doesn't go negative or too low
    currentPrice = Math.max(currentPrice, basePrice * 0.5);
    
    // Calculate realistic open, high, low values based on close
    const dailyVolatility = volatility * 0.7;
    const open = currentPrice * (1 + dailyVolatility * (Math.random() - 0.5));
    const high = Math.max(open, currentPrice) * (1 + dailyVolatility * Math.random());
    const low = Math.min(open, currentPrice) * (1 - dailyVolatility * Math.random());
    
    // Generate realistic volume based on stock popularity
    const baseVolume = symbol === 'AAPL' || symbol === 'TSLA' ? 20000000 : 
                      symbol === 'NVDA' || symbol === 'AMZN' ? 15000000 : 
                      symbol === 'MSFT' || symbol === 'GOOGL' ? 10000000 : 5000000;
    const volume = Math.floor(baseVolume * (0.7 + 0.6 * Math.random()));
    
    prices.push({
      timestamp,
      open,
      high,
      low,
      close: currentPrice,
      volume
    });
  }
  
  return prices; // Already in chronological order
}; 