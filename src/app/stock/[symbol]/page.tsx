import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import StockChart from '@/components/stock/StockChart';
import StockInfo from '@/components/stock/StockInfo';
import { getEnhancedStockDetails, getEnhancedStockPrices } from '@/lib/api/stockApi';
import { Stock, StockPrices } from '@/types/stock';

interface StockPageProps {
  params: {
    symbol: string;
  };
}

export async function generateMetadata({ params }: StockPageProps): Promise<Metadata> {
  const { symbol } = params;
  
  try {
    const stock = await getEnhancedStockDetails(symbol);
    
    if (!stock) {
      return {
        title: 'Stock Not Found',
        description: 'The requested stock could not be found.',
      };
    }
    
    return {
      title: `${stock.name} (${stock.symbol}) - StockScreener`,
      description: `View detailed information and price charts for ${stock.name} (${stock.symbol}).`,
    };
  } catch (error) {
    console.error(`Error generating metadata for ${symbol}:`, error);
    return {
      title: 'Stock Details - StockScreener',
      description: 'View detailed information and price charts for stocks.',
    };
  }
}

// Fallback UI for when there's an error
function StockPageFallback() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-red-800 dark:text-red-400 mb-2">
          Error Loading Stock Data
        </h2>
        <p className="text-red-700 dark:text-red-300 mb-4">
          We encountered an error while loading the stock data. Please try again later.
        </p>
        <a 
          href="/"
          className="inline-block bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
}

// Default empty prices object to prevent null/undefined errors
const emptyPrices: StockPrices = {
  daily: [],
  weekly: [],
  monthly: [],
  threeMonth: [],
  yearly: [],
  fiveYear: []
};

export default async function StockPage({ params }: StockPageProps) {
  const { symbol } = params;
  console.log(`Fetching stock data for symbol: ${symbol}`);
  
  let stock: Stock | null = null;
  let prices: StockPrices = emptyPrices;
  
  try {
    // Fetch stock details and prices in parallel with simple Promise.all
    const [stockData, pricesData] = await Promise.all([
      getEnhancedStockDetails(symbol),
      getEnhancedStockPrices(symbol).catch(() => emptyPrices)
    ]);
    
    stock = stockData;
    prices = pricesData || emptyPrices;
    
    // If we couldn't get the stock details, show 404
    if (!stock) {
      console.log(`No stock details found for ${symbol}, showing 404`);
      notFound();
    }
    
    // Log what we got for debugging
    console.log('Stock data loaded:', {
      symbol: params.symbol,
      hasStockDetails: !!stock,
      dailyPrices: prices?.daily?.length || 0,
      weeklyPrices: prices?.weekly?.length || 0,
      monthlyPrices: prices?.monthly?.length || 0,
      threeMonthPrices: prices?.threeMonth?.length || 0,
      yearlyPrices: prices?.yearly?.length || 0,
      fiveYearPrices: prices?.fiveYear?.length || 0
    });
    
    // Render the page with the data we have
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h1 className="text-3xl font-bold mb-2">{stock.name} ({stock.symbol})</h1>
            <p className="text-gray-500 mb-6">{stock.exchange || 'Unknown Exchange'}</p>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
              <StockChart 
                prices={prices}
              />
            </div>
          </div>
          
          <div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <StockInfo stock={stock} />
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error(`Error rendering stock page for ${symbol}:`, error);
    return <StockPageFallback />;
  }
} 