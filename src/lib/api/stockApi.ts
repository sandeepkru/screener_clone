import axios from 'axios';
import { ApiResponse, Company, StockData, StockPrice, TimeRange } from '@/types';

// Use environment variables for API configuration
const POLYGON_API_KEY = process.env.NEXT_PUBLIC_POLYGON_API_KEY || 'YtnvCxedt0rrFLOuASl6zizYHzg9wM5E';
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.polygon.io';

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
export const getStockPrices = async (
  symbol: string,
  timeRange: TimeRange
): Promise<ApiResponse<StockPrice[]>> => {
  try {
    // Set up date range based on timeRange
    const now = new Date();
    const endDate = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    let startDate;
    let multiplier = 1;
    let timespan = 'day';
    
    switch (timeRange) {
      case '1D':
        // For 1 day, use minute data
        multiplier = 5;
        timespan = 'minute';
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = yesterday.toISOString().split('T')[0];
        break;
      case '1W':
        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        startDate = oneWeekAgo.toISOString().split('T')[0];
        break;
      case '1M':
        const oneMonthAgo = new Date(now);
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        startDate = oneMonthAgo.toISOString().split('T')[0];
        break;
      case '3M':
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        startDate = threeMonthsAgo.toISOString().split('T')[0];
        break;
      case '1Y':
        const oneYearAgo = new Date(now);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        startDate = oneYearAgo.toISOString().split('T')[0];
        break;
      case '5Y':
        const fiveYearsAgo = new Date(now);
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
        startDate = fiveYearsAgo.toISOString().split('T')[0];
        // Use weekly data for 5Y to reduce data points
        multiplier = 1;
        timespan = 'week';
        break;
      default:
        const defaultDate = new Date(now);
        defaultDate.setDate(defaultDate.getDate() - 7);
        startDate = defaultDate.toISOString().split('T')[0];
    }
    
    // Debug: Log API request details
    console.log(`Fetching ${symbol} prices for ${timeRange}:`, {
      url: `/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${startDate}/${endDate}`,
      apiKey: POLYGON_API_KEY.substring(0, 5) + '...',
      baseUrl: BASE_URL
    });
    
    // Make API call to Polygon
    const response = await api.get(
      `/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${startDate}/${endDate}`
    );
    
    // Debug: Log API response
    console.log(`API Response for ${symbol} (${timeRange}):`, {
      status: response.status,
      statusText: response.statusText,
      hasResults: !!response.data?.results,
      resultsCount: response.data?.results?.length || 0
    });
    
    if (response.data && response.data.results && response.data.results.length > 0) {
      // Transform Polygon data to our StockPrice format
      const prices: StockPrice[] = response.data.results.map((item: any) => ({
        timestamp: item.t,
        open: item.o,
        high: item.h,
        low: item.l,
        close: item.c,
        volume: item.v,
      }));
      
      console.log(`Transformed ${prices.length} price points for ${symbol} (${timeRange})`);
      
      return { success: true, data: prices };
    }
    
    // Fallback to mock data if API doesn't return expected results
    console.log(`No results from API for ${symbol} (${timeRange}), falling back to mock data`);
    let days = 0;
    let basePrice = 0;
    
    switch (timeRange) {
      case '1D': days = 1; break;
      case '1W': days = 7; break;
      case '1M': days = 30; break;
      case '3M': days = 90; break;
      case '1Y': days = 365; break;
      case '5Y': days = 1825; break;
    }
    
    // Set different base prices for different symbols
    if (symbol.toUpperCase() === 'AAPL') {
      basePrice = 240; // Updated to more current price
    } else if (symbol.toUpperCase() === 'MSFT') {
      basePrice = 420; // Updated to more current price
    } else {
      basePrice = 100 + Math.random() * 200;
    }
    
    const mockPrices = generateMockPrices(days, basePrice);
    console.log(`Generated ${mockPrices.length} mock price points for ${symbol} (${timeRange})`);
    return { success: true, data: mockPrices };
    
  } catch (error) {
    console.error(`Error fetching ${symbol} prices for ${timeRange}:`, error);
    
    // Fallback to mock data on error
    console.log(`Error occurred, falling back to mock data for ${symbol} (${timeRange})`);
    let days = 0;
    let basePrice = 0;
    
    switch (timeRange) {
      case '1D': days = 1; break;
      case '1W': days = 7; break;
      case '1M': days = 30; break;
      case '3M': days = 90; break;
      case '1Y': days = 365; break;
      case '5Y': days = 1825; break;
    }
    
    // Set different base prices for different symbols with more current values
    if (symbol.toUpperCase() === 'AAPL') {
      basePrice = 240; // Updated to more current price
    } else if (symbol.toUpperCase() === 'MSFT') {
      basePrice = 420; // Updated to more current price
    } else {
      basePrice = 100 + Math.random() * 200;
    }
    
    const prices = generateMockPrices(days, basePrice);
    console.log(`Generated ${prices.length} mock price points for ${symbol} (${timeRange}) after error`);
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
    
    const dailyResponse = await getStockPrices(symbol, '1D');
    const weeklyResponse = await getStockPrices(symbol, '1W');
    const monthlyResponse = await getStockPrices(symbol, '1M');
    const yearlyResponse = await getStockPrices(symbol, '1Y');
    
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

// Search for companies
export const searchCompanies = async (query: string): Promise<ApiResponse<Company[]>> => {
  try {
    if (!query) {
      return { success: true, data: [] };
    }
    
    // Use the actual API
    const response = await api.get(`/v3/reference/tickers`, {
      params: { search: query, active: true, sort: 'ticker', order: 'asc', limit: 10 }
    });
    
    if (response.data && response.data.results) {
      const companies: Company[] = response.data.results.map((item: any) => ({
        symbol: item.ticker,
        name: item.name,
        description: item.description || '',
        sector: item.sic_description || '',
        industry: item.industry || '',
        marketCap: item.market_cap || 0,
        employees: item.total_employees || 0,
        ceo: '',
        website: item.homepage_url || '',
        exchange: item.primary_exchange || '',
      }));
      
      return { success: true, data: companies };
    }
    
    // Fallback to mock data if API doesn't return expected results
    const filteredCompanies = mockCompanies.filter(
      company => 
        company.symbol.toLowerCase().includes(query.toLowerCase()) || 
        company.name.toLowerCase().includes(query.toLowerCase())
    );
    
    return { success: true, data: filteredCompanies };
  } catch (error) {
    console.error('Error searching companies:', error);
    
    // Fallback to mock data on error
    const filteredCompanies = mockCompanies.filter(
      company => 
        company.symbol.toLowerCase().includes(query.toLowerCase()) || 
        company.name.toLowerCase().includes(query.toLowerCase())
    );
    
    return { success: true, data: filteredCompanies };
  }
}; 