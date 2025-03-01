import axios from 'axios';
import { ApiResponse, Company, StockData, StockPrice, TimeRange as ApiTimeRange } from '@/types';
import { Stock, StockPrices, TimeRange } from '@/types/stock';
import cacheService from '../cache/cacheService';

// Use environment variables for API configuration
const POLYGON_API_KEY = process.env.NEXT_PUBLIC_POLYGON_API_KEY || 'YtnvCxedt0rrFLOuASl6zizYHzg9wM5E';
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.polygon.io';

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
});

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

// Generate mock price data
const generateMockPrices = (days: number, basePrice: number): StockPrice[] => {
  const prices: StockPrice[] = [];
  const now = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    const volatility = 0.02; // 2% volatility
    const change = basePrice * volatility * (Math.random() - 0.5);
    const newPrice = basePrice + change;
    
    basePrice = newPrice;
    
    prices.push({
      timestamp: date.getTime(),
      open: newPrice - (newPrice * 0.005 * Math.random()),
      high: newPrice + (newPrice * 0.01 * Math.random()),
      low: newPrice - (newPrice * 0.01 * Math.random()),
      close: newPrice,
      volume: Math.floor(1000000 + Math.random() * 10000000),
    });
  }
  
  return prices;
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
    let startDate = new Date(now);
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
        const prices: StockPrice[] = response.data.results.map((item: any) => ({
          date: new Date(item.t).toISOString(),
          value: item.c,
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
      
      throw new Error('No price data found');
    } catch (apiError) {
      console.error(`API error for ${symbol} (${timeRange}):`, apiError);
      console.log(`Falling back to mock data for ${symbol} (${timeRange})`);
      
      // Generate mock data as fallback
      const days = timeRange === '1D' ? 1 : 
                  timeRange === '1W' ? 7 : 
                  timeRange === '1M' ? 30 : 
                  timeRange === '3M' ? 90 : 
                  timeRange === '1Y' ? 365 : 1825;
      
      const basePrice = 100 + Math.random() * 900; // Random price between 100 and 1000
      const mockPrices = generateMockPrices(days, basePrice);
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
                timeRange === '1Y' ? 365 : 1825;
    
    const basePrice = 100 + Math.random() * 900; // Random price between 100 and 1000
    const prices = generateMockPrices(days, basePrice);
    console.log(`Generated ${prices.length} mock price points for ${symbol} (${timeRange}) after error`);
    
    // Cache the result
    const cacheTtl = timeRange === '1D' ? CACHE_TTL.DAILY_PRICES : 
                     timeRange === '1W' ? CACHE_TTL.WEEKLY_PRICES :
                     timeRange === '1M' || timeRange === '3M' ? CACHE_TTL.MONTHLY_PRICES :
                     CACHE_TTL.YEARLY_PRICES;
    
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
      return { success: true, data: [] };
    }
    
    // Check cache first
    const cacheKey = `stock:search:${query}`;
    const cachedData = await cacheService.get<Company[]>(cacheKey);
    
    if (cachedData) {
      console.log(`Cache hit for stock search: ${query}`);
      return { success: true, data: cachedData };
    }
    
    console.log(`Cache miss for stock search: ${query}, fetching from API`);
    
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
      const companies: Company[] = response.data.results.map((item: any) => ({
        symbol: item.ticker,
        name: item.name,
        description: '',
        market_cap: 0,
        exchange: item.primary_exchange || '',
      }));
      
      // Cache the result for a shorter time (1 hour)
      await cacheService.set(cacheKey, companies, 60 * 60);
      
      return { success: true, data: companies };
    }
    
    return { success: false, error: 'No search results found' };
  } catch (error) {
    console.error('Error searching stocks:', error);
    return { success: false, error: 'Failed to search stocks' };
  }
};

// Helper function to generate mock price data
const generateMockPrices = (days: number, basePrice: number): StockPrice[] => {
  const prices: StockPrice[] = [];
  const now = new Date();
  let currentPrice = basePrice;
  
  // Generate more data points for shorter time ranges
  const pointsPerDay = days <= 1 ? 78 : // ~5min intervals for 1D (market hours)
                      days <= 7 ? 24 : // hourly for 1W
                      days <= 30 ? 1 : // daily for 1M
                      days <= 90 ? 1 : // daily for 3M
                      days <= 365 ? 1 : // daily for 1Y
                      0.2; // ~weekly for 5Y
  
  const totalPoints = Math.floor(days * pointsPerDay);
  const volatility = 0.02; // 2% price movement
  
  for (let i = 0; i < totalPoints; i++) {
    // Calculate date going backward from now
    const date = new Date(now);
    date.setMinutes(date.getMinutes() - (i * (24 * 60 / pointsPerDay)));
    
    // Random price movement
    const change = currentPrice * volatility * (Math.random() - 0.5);
    currentPrice += change;
    
    if (currentPrice < 1) currentPrice = 1; // Ensure price doesn't go below 1
    
    prices.unshift({
      date: date.toISOString(),
      value: parseFloat(currentPrice.toFixed(2)),
    });
  }
  
  return prices;
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
export async function getEnhancedStockPrices(symbol: string): Promise<StockPrices | null> {
  try {
    const dailyPrices = await getEnhancedDailyPrices(symbol);
    const weeklyPrices = await getEnhancedWeeklyPrices(symbol);
    const monthlyPrices = await getEnhancedMonthlyPrices(symbol);
    const yearlyPrices = await getEnhancedYearlyPrices(symbol);

    return {
      daily: dailyPrices || [],
      weekly: weeklyPrices || [],
      monthly: monthlyPrices || [],
      yearly: yearlyPrices || [],
    };
  } catch (error) {
    console.error(`Error fetching enhanced stock prices for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch daily stock prices (1D) with enhanced caching
 */
async function getEnhancedDailyPrices(symbol: string): Promise<{ date: string; price: number }[] | null> {
  try {
    // Check cache first
    const cacheKey = `stock:enhanced:prices:daily:${symbol}`;
    const cachedData = await cacheService.get<{ date: string; price: number }[]>(cacheKey);
    
    if (cachedData) {
      console.log(`Cache hit for enhanced daily prices: ${symbol}`);
      return cachedData;
    }
    
    console.log(`Cache miss for enhanced daily prices: ${symbol}, fetching from API`);
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const formattedToday = today.toISOString().split('T')[0];
    const formattedYesterday = yesterday.toISOString().split('T')[0];

    const response = await fetch(
      `${BASE_URL}/v2/aggs/ticker/${symbol}/range/5/minute/${formattedYesterday}/${formattedToday}?apiKey=${POLYGON_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch daily prices: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.results) {
      console.error('No results found for daily prices:', data);
      return null;
    }

    const prices = data.results.map((item: any) => ({
      date: new Date(item.t).toISOString(),
      price: item.c,
    }));
    
    // Cache the result
    await cacheService.set(cacheKey, prices, CACHE_TTL.DAILY_PRICES);
    
    return prices;
  } catch (error) {
    console.error(`Error fetching enhanced daily prices for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch weekly stock prices (1W) with enhanced caching
 */
async function getEnhancedWeeklyPrices(symbol: string): Promise<{ date: string; price: number }[] | null> {
  try {
    // Check cache first
    const cacheKey = `stock:enhanced:prices:weekly:${symbol}`;
    const cachedData = await cacheService.get<{ date: string; price: number }[]>(cacheKey);
    
    if (cachedData) {
      console.log(`Cache hit for enhanced weekly prices: ${symbol}`);
      return cachedData;
    }
    
    console.log(`Cache miss for enhanced weekly prices: ${symbol}, fetching from API`);
    
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const formattedToday = today.toISOString().split('T')[0];
    const formattedLastWeek = lastWeek.toISOString().split('T')[0];

    const response = await fetch(
      `${BASE_URL}/v2/aggs/ticker/${symbol}/range/1/hour/${formattedLastWeek}/${formattedToday}?apiKey=${POLYGON_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch weekly prices: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.results) {
      console.error('No results found for weekly prices:', data);
      return null;
    }

    const prices = data.results.map((item: any) => ({
      date: new Date(item.t).toISOString(),
      price: item.c,
    }));
    
    // Cache the result
    await cacheService.set(cacheKey, prices, CACHE_TTL.WEEKLY_PRICES);
    
    return prices;
  } catch (error) {
    console.error(`Error fetching enhanced weekly prices for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch monthly stock prices (1M) with enhanced caching
 */
async function getEnhancedMonthlyPrices(symbol: string): Promise<{ date: string; price: number }[] | null> {
  try {
    // Check cache first
    const cacheKey = `stock:enhanced:prices:monthly:${symbol}`;
    const cachedData = await cacheService.get<{ date: string; price: number }[]>(cacheKey);
    
    if (cachedData) {
      console.log(`Cache hit for enhanced monthly prices: ${symbol}`);
      return cachedData;
    }
    
    console.log(`Cache miss for enhanced monthly prices: ${symbol}, fetching from API`);
    
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const formattedToday = today.toISOString().split('T')[0];
    const formattedLastMonth = lastMonth.toISOString().split('T')[0];

    const response = await fetch(
      `${BASE_URL}/v2/aggs/ticker/${symbol}/range/1/day/${formattedLastMonth}/${formattedToday}?apiKey=${POLYGON_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch monthly prices: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.results) {
      console.error('No results found for monthly prices:', data);
      return null;
    }

    const prices = data.results.map((item: any) => ({
      date: new Date(item.t).toISOString(),
      price: item.c,
    }));
    
    // Cache the result
    await cacheService.set(cacheKey, prices, CACHE_TTL.MONTHLY_PRICES);
    
    return prices;
  } catch (error) {
    console.error(`Error fetching enhanced monthly prices for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch yearly stock prices (1Y) with enhanced caching
 */
async function getEnhancedYearlyPrices(symbol: string): Promise<{ date: string; price: number }[] | null> {
  try {
    // Check cache first
    const cacheKey = `stock:enhanced:prices:yearly:${symbol}`;
    const cachedData = await cacheService.get<{ date: string; price: number }[]>(cacheKey);
    
    if (cachedData) {
      console.log(`Cache hit for enhanced yearly prices: ${symbol}`);
      return cachedData;
    }
    
    console.log(`Cache miss for enhanced yearly prices: ${symbol}, fetching from API`);
    
    const today = new Date();
    const lastYear = new Date(today);
    lastYear.setFullYear(lastYear.getFullYear() - 1);
    
    const formattedToday = today.toISOString().split('T')[0];
    const formattedLastYear = lastYear.toISOString().split('T')[0];

    const response = await fetch(
      `${BASE_URL}/v2/aggs/ticker/${symbol}/range/1/week/${formattedLastYear}/${formattedToday}?apiKey=${POLYGON_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch yearly prices: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.results) {
      console.error('No results found for yearly prices:', data);
      return null;
    }

    const prices = data.results.map((item: any) => ({
      date: new Date(item.t).toISOString(),
      price: item.c,
    }));
    
    // Cache the result
    await cacheService.set(cacheKey, prices, CACHE_TTL.YEARLY_PRICES);
    
    return prices;
  } catch (error) {
    console.error(`Error fetching enhanced yearly prices for ${symbol}:`, error);
    return null;
  }
}

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

    const stocks = data.results.map((item: any) => ({
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