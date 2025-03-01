import { StockPrice } from '@/types';

/**
 * Generate mock price data for a stock
 * @param days Number of days to generate data for
 * @param basePrice Starting price
 * @returns Array of stock price data points
 */
export const generateMockPrices = (days: number, basePrice: number): StockPrice[] => {
  const prices: StockPrice[] = [];
  const now = new Date();
  
  // For 5Y data, we need to generate fewer points to avoid performance issues
  // but ensure they span the full 5-year period
  const step = days > 1000 ? Math.ceil(days / 60) : 1; // For 5Y, generate ~60 data points
  
  for (let i = days; i >= 0; i -= step) {
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
  
  // Ensure we have at least the first and last data point
  if (prices.length > 0 && prices[prices.length - 1].timestamp !== now.getTime()) {
    prices.push({
      timestamp: now.getTime(),
      open: basePrice - (basePrice * 0.005 * Math.random()),
      high: basePrice + (basePrice * 0.01 * Math.random()),
      low: basePrice - (basePrice * 0.01 * Math.random()),
      close: basePrice,
      volume: Math.floor(1000000 + Math.random() * 10000000),
    });
  }
  
  return prices;
}; 