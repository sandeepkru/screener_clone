'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Define the FeaturedStock type
interface FeaturedStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  percentChange: number;
  isMockData: boolean;
}

export default function FeaturedStocks() {
  const [featuredStocks, setFeaturedStocks] = useState<FeaturedStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(true);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const featuredStocksRef = useRef<HTMLDivElement>(null);
  const isDarkMode = false; // You can implement dark mode detection if needed

  useEffect(() => {
    const fetchFeaturedStocks = async () => {
      console.log('Fetching featured stocks...');
      setIsLoading(true);
      
      try {
        console.log('Fetching from API endpoint: /api/stocks/featured');
        const response = await fetch('/api/stocks/featured');
        const result = await response.json();
        
        console.log('API response:', result);
        
        if (result.success && result.data && result.data.length > 0) {
          console.log('Using featured stocks data from API, found', result.data.length, 'stocks');
          setFeaturedStocks(result.data);
        } else {
          console.warn('No featured stocks data returned from API');
          setFeaturedStocks([]);
        }
      } catch (error) {
        console.error('Error fetching featured stocks:', error);
        setFeaturedStocks([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFeaturedStocks();
  }, []);

  // Function to scroll the featured stocks container
  const scrollFeaturedStocks = (direction: 'left' | 'right') => {
    if (featuredStocksRef.current) {
      const container = featuredStocksRef.current;
      const scrollAmount = container.clientWidth * 0.8; // Scroll 80% of the visible width
      container.scrollBy({ 
        left: direction === 'right' ? scrollAmount : -scrollAmount, 
        behavior: 'smooth' 
      });
    }
  };

  // Function to handle scroll event and update shadows
  const handleScroll = () => {
    if (featuredStocksRef.current) {
      const container = featuredStocksRef.current;
      const isAtStart = container.scrollLeft <= 10;
      const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 10;
      
      setShowLeftShadow(!isAtStart);
      setShowRightShadow(!isAtEnd);
    }
  };

  // Set up auto-scrolling
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoScrollEnabled && featuredStocksRef.current) {
      interval = setInterval(() => {
        if (featuredStocksRef.current) {
          const container = featuredStocksRef.current;
          const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 10;
          
          if (isAtEnd) {
            container.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            scrollFeaturedStocks('right');
          }
        }
      }, 5000); // Auto-scroll every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoScrollEnabled]);

  return (
    <section className="py-16 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Featured Stocks</h2>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
        ) : (
          <div className="relative">
            {/* Left shadow */}
            {showLeftShadow && (
              <div className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none" 
                style={{ 
                  background: isDarkMode 
                    ? 'linear-gradient(to right, rgba(17, 24, 39, 1), rgba(17, 24, 39, 0))' 
                    : 'linear-gradient(to right, rgba(243, 244, 246, 1), rgba(243, 244, 246, 0))'
                }}>
              </div>
            )}
            
            <div 
              ref={featuredStocksRef}
              className="flex overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth gap-4 no-scrollbar"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              onScroll={handleScroll}
            >
              {featuredStocks.map((stock) => (
                <Link key={stock.symbol} href={`/stock/${stock.symbol}`} className="flex-none w-[280px] snap-start">
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
            
            {/* Right shadow */}
            {showRightShadow && (
              <div className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none" 
                style={{ 
                  background: isDarkMode 
                    ? 'linear-gradient(to left, rgba(17, 24, 39, 1), rgba(17, 24, 39, 0))' 
                    : 'linear-gradient(to left, rgba(243, 244, 246, 1), rgba(243, 244, 246, 0))'
                }}>
              </div>
            )}
            
            {/* Left scroll button */}
            {showLeftShadow && (
              <div 
                className="absolute left-0 top-1/2 transform -translate-y-1/2 flex space-x-2 -mt-4 ml-4 z-20"
              >
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="rounded-full shadow-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => {
                    setAutoScrollEnabled(false);
                    scrollFeaturedStocks('left');
                  }}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    strokeWidth={2} 
                    stroke="currentColor" 
                    className="w-5 h-5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </Button>
              </div>
            )}
            
            {/* Right scroll button */}
            {showRightShadow && (
              <div 
                className="absolute right-0 top-1/2 transform -translate-y-1/2 flex space-x-2 -mt-4 mr-4 z-20"
              >
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="rounded-full shadow-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => {
                    setAutoScrollEnabled(false);
                    scrollFeaturedStocks('right');
                  }}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    strokeWidth={2} 
                    stroke="currentColor" 
                    className="w-5 h-5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
} 