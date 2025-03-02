'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getStockData, getEnhancedStockDetails, getEnhancedStockPrices } from '@/lib/api/stockApi';
import { getCachedFeaturedStocks, FEATURED_SYMBOLS } from '@/lib/cache/prefetch';

// Mock data functions
function getMockCompanyName(symbol: string) {
  const names: Record<string, string> = {
    'AAPL': 'Apple Inc.',
    'MSFT': 'Microsoft Corporation',
    'GOOGL': 'Alphabet Inc.',
    'AMZN': 'Amazon.com Inc.',
    'META': 'Meta Platforms, Inc.',
    'TSLA': 'Tesla, Inc.',
    'NVDA': 'NVIDIA Corporation',
    'JPM': 'JPMorgan Chase & Co.',
    'V': 'Visa Inc.',
    'WMT': 'Walmart Inc.'
  };
  return names[symbol] || 'Unknown Company';
}

function getRealisticMockPrice(symbol: string) {
  const prices: Record<string, number> = {
    'AAPL': 241.84,
    'MSFT': 420.35,
    'GOOGL': 175.98,
    'AMZN': 178.75,
    'META': 485.20,
    'TSLA': 175.30,
    'NVDA': 950.25,
    'JPM': 198.45,
    'V': 275.60,
    'WMT': 68.75
  };
  return prices[symbol] || 100.00;
}

function getRealisticMockChange(symbol: string) {
  const changes: Record<string, number> = {
    'AAPL': 3.61,
    'MSFT': 5.2,
    'GOOGL': -1.8,
    'AMZN': 0.89,
    'META': 7.35,
    'TSLA': -2.45,
    'NVDA': 15.80,
    'JPM': 2.35,
    'V': 3.25,
    'WMT': -0.45
  };
  return changes[symbol] || 0.00;
}

function getRealisticMockPercentChange(symbol: string) {
  const percentChanges: Record<string, number> = {
    'AAPL': 1.52,
    'MSFT': 1.25,
    'GOOGL': -1.01,
    'AMZN': 0.5,
    'META': 1.54,
    'TSLA': -1.38,
    'NVDA': 1.69,
    'JPM': 1.20,
    'V': 1.19,
    'WMT': -0.65
  };
  return percentChanges[symbol] || 0.00;
}

// Helper function to get complete mock data for a symbol
function getMockData(symbol: string) {
  return {
    symbol,
    name: getMockCompanyName(symbol),
    price: getRealisticMockPrice(symbol),
    change: getRealisticMockChange(symbol),
    percentChange: getRealisticMockPercentChange(symbol)
  };
}

// Define the FeaturedStock type
interface FeaturedStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  percentChange: number;
  isMockData?: boolean;
}

export default function Home() {
  const [featuredStocks, setFeaturedStocks] = useState<{
    symbol: string;
    name: string;
    price: number;
    change: number;
    percentChange: number;
    isMockData?: boolean;
  }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Use the predefined list of featured symbols from the prefetch utility
  const featuredSymbols = useMemo(() => FEATURED_SYMBOLS, []);
  
  useEffect(() => {
    const fetchFeaturedStocks = async () => {
      setIsLoading(true);
      
      try {
        // First try to get cached featured stocks
        const cachedStocks = await getCachedFeaturedStocks();
        
        if (cachedStocks && cachedStocks.length > 0) {
          console.log('Using cached featured stocks data');
          
          // Transform cached stocks to match the expected format
          const formattedStocks = cachedStocks.map(stock => ({
            symbol: stock.symbol,
            name: stock.name,
            price: stock.price,
            change: stock.change,
            percentChange: stock.percentChange,
            isMockData: stock.isMockData || false
          }));
          
          setFeaturedStocks(formattedStocks);
          setIsLoading(false);
          
          // Refresh the cache in the background
          fetch('/api/cache/refresh-featured')
            .then(() => console.log('Featured stocks cache refreshed in background'))
            .catch(error => console.error('Error refreshing featured stocks cache:', error));
          
          return;
        }
        
        // If no cached data, fall back to the existing implementation
        const validStocks: FeaturedStock[] = [];
        
        for (const symbol of featuredSymbols) {
          try {
            console.log(`Fetching enhanced data for ${symbol}...`);
            
            // Get stock details
            const details = await getEnhancedStockDetails(symbol);
            
            if (!details) {
              throw new Error(`No details found for ${symbol}`);
            }
            
            // Get daily prices
            const prices = await getEnhancedStockPrices(symbol);
            
            if (!prices || prices.daily.length === 0) {
              throw new Error(`No price data found for ${symbol}`);
            }
            
            // Calculate price change
            const latestPrice = prices.daily[prices.daily.length - 1].price;
            let priceChange = 0;
            let percentChange = 0;
            
            if (prices.daily.length >= 2) {
              const previousPrice = prices.daily[0].price;
              priceChange = latestPrice - previousPrice;
              percentChange = (priceChange / previousPrice) * 100;
            }
            
            console.log(`Successfully fetched enhanced data for ${symbol}: $${latestPrice.toFixed(2)}`);
            
            validStocks.push({
              symbol,
              name: details.name,
              price: latestPrice,
              change: priceChange,
              percentChange: percentChange,
              isMockData: false
            });
          } catch (error) {
            console.error(`Error fetching data for ${symbol}:`, error);
            
            // Use fallback mock data
            const mockData = getMockData(symbol);
            if (mockData) {
              validStocks.push({
                ...mockData,
                isMockData: true
              });
            }
          }
        }
        
        // Filter out any undefined stocks
        const filteredStocks = validStocks.filter(Boolean);
        setFeaturedStocks(filteredStocks);
      } catch (error) {
        console.error('Error fetching featured stocks:', error);
        
        // Use fallback mock data for all stocks
        const mockStocks = featuredSymbols
          .map(symbol => {
            const mockData = getMockData(symbol);
            return mockData ? { ...mockData, isMockData: true } : null;
          })
          .filter(Boolean) as FeaturedStock[];
        
        setFeaturedStocks(mockStocks);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFeaturedStocks();
  }, [featuredSymbols]);
  
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Stock Analysis and Screening Tool for Investors
            </h1>
            <p className="text-xl mb-8">
              Research stocks, analyze financial data, and make informed investment decisions with our powerful screening tools.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/register">Get Started for Free</Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-white/10" asChild>
                <Link href="/features">Explore Features</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Featured Stocks */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Featured Stocks</h2>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredStocks.map((stock) => (
                <Link key={stock.symbol} href={`/stock/${stock.symbol}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold">{stock.symbol}</h3>
                          <p className="text-sm text-gray-500">{stock.name}</p>
                          {stock.isMockData && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                              Mock Data
                            </span>
                          )}
                        </div>
                        <div className={`text-right ${stock.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          <p className="text-lg font-bold">
                            ${(stock.price !== undefined && stock.price !== null) ? stock.price.toFixed(2) : '0.00'}
                          </p>
                          <p className="text-sm">
                            {stock.change >= 0 ? '+' : ''}
                            {(stock.change !== undefined && stock.change !== null) ? stock.change.toFixed(2) : '0.00'} ({stock.change >= 0 ? '+' : ''}
                            {(stock.percentChange !== undefined && stock.percentChange !== null) ? stock.percentChange.toFixed(2) : '0.00'}%)
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full">View Details</Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose StockScreener</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="bg-blue-100 dark:bg-blue-900 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-8 h-8 text-blue-600 dark:text-blue-300"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Real-Time Data</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Access real-time stock prices, financial data, and market insights to make timely investment decisions.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="bg-blue-100 dark:bg-blue-900 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-8 h-8 text-blue-600 dark:text-blue-300"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Advanced Screening</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Filter stocks based on financial metrics, technical indicators, and custom criteria to find the best investment opportunities.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="bg-blue-100 dark:bg-blue-900 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-8 h-8 text-blue-600 dark:text-blue-300"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Comprehensive Analysis</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Get detailed financial analysis, technical indicators, and fundamental data to make informed investment decisions.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Start Investing Smarter?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join thousands of investors who use StockScreener to research, analyze, and make better investment decisions.
          </p>
          <Button size="lg" variant="outline" className="bg-white text-blue-600 hover:bg-blue-50" asChild>
            <Link href="/register">Create Free Account</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
