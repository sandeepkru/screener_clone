/**
 * Utility functions to prefetch and cache data for featured stocks
 */

import { getEnhancedStockDetails, getEnhancedStockPrices, Stock, StockPrices } from "@/lib/api/stockApi";
import cacheService from "@/lib/cache/cacheService";

// List of featured stock symbols (top US companies)
export const FEATURED_SYMBOLS = [
  "AAPL",    // Apple
  "MSFT",    // Microsoft
  "GOOGL",   // Alphabet (Google)
  "AMZN",    // Amazon
  "META",    // Meta Platforms (Facebook)
  "TSLA",    // Tesla
  "NVDA",    // NVIDIA
  "JPM",     // JPMorgan Chase
  "V",       // Visa
  "WMT"      // Walmart
];

// Cache keys
const FEATURED_STOCKS_CACHE_KEY = "featured:stocks";
const CACHE_TTL = 60 * 60; // 1 hour in seconds

/**
 * Prefetches and caches data for featured stocks
 * @returns {Promise<boolean>} Success status
 */
export async function prefetchFeaturedStocks(): Promise<boolean> {
  try {
    console.info("Prefetching featured stocks data");
    
    const stocksData = await Promise.all(
      FEATURED_SYMBOLS.map(async (symbol) => {
        try {
          // Fetch stock details
          const details = await getEnhancedStockDetails(symbol);
          
          // Fetch daily prices
          const dailyPrices = await getEnhancedStockPrices(symbol);
          
          // Calculate price change and percent change
          let priceChange = 0;
          let percentChange = 0;
          
          if (dailyPrices && dailyPrices.daily.length >= 2) {
            const latestPrice = dailyPrices.daily[dailyPrices.daily.length - 1].price;
            const previousPrice = dailyPrices.daily[0].price;
            priceChange = latestPrice - previousPrice;
            percentChange = (priceChange / previousPrice) * 100;
          }
          
          return {
            symbol,
            name: details?.name || symbol,
            price: dailyPrices?.daily[dailyPrices.daily.length - 1]?.price || 0,
            change: priceChange,
            percentChange: percentChange,
            isMockData: false
          };
        } catch (error) {
          console.error(`Error prefetching data for ${symbol}:`, error);
          return null;
        }
      })
    );
    
    // Filter out null values
    const validStocks = stocksData.filter(stock => stock !== null);
    
    if (validStocks.length > 0) {
      // Cache the featured stocks data
      await cacheService.set(FEATURED_STOCKS_CACHE_KEY, JSON.stringify(validStocks), CACHE_TTL);
      console.info(`Successfully cached ${validStocks.length} featured stocks`);
      return true;
    } else {
      console.warn("No valid featured stocks data to cache");
      return false;
    }
  } catch (error) {
    console.error("Error in prefetchFeaturedStocks:", error);
    return false;
  }
}

/**
 * Retrieves cached featured stocks data
 * @returns {Promise<Array<any> | null>} Cached featured stocks or null if not found
 */
export async function getCachedFeaturedStocks(): Promise<Array<any> | null> {
  try {
    const cachedData = await cacheService.get<string>(FEATURED_STOCKS_CACHE_KEY);
    
    if (!cachedData) {
      console.info("No cached featured stocks found");
      return null;
    }
    
    return JSON.parse(cachedData);
  } catch (error) {
    console.error("Error retrieving cached featured stocks:", error);
    return null;
  }
} 