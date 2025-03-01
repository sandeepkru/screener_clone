import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import StockChart from '@/components/stock/StockChart';
import StockInfo from '@/components/stock/StockInfo';
import { getEnhancedStockDetails, getEnhancedStockPrices } from '@/lib/api/stockApi';

interface StockPageProps {
  params: {
    symbol: string;
  };
}

export async function generateMetadata({ params }: StockPageProps): Promise<Metadata> {
  const { symbol } = params;
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
}

export default async function StockPage({ params }: StockPageProps) {
  const { symbol } = params;
  console.log(`Fetching stock data for symbol: ${symbol}`);
  
  const stock = await getEnhancedStockDetails(symbol);
  const prices = await getEnhancedStockPrices(symbol);
  
  if (!stock) {
    notFound();
  }
  
  console.log(`Current stock data for ${symbol}:`, {
    symbol: stock.symbol,
    name: stock.name,
    dailyPrices: prices?.daily.length || 0,
    weeklyPrices: prices?.weekly.length || 0,
    monthlyPrices: prices?.monthly.length || 0,
    yearlyPrices: prices?.yearly.length || 0,
  });
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-bold mb-2">{stock.name} ({stock.symbol})</h1>
          <p className="text-gray-500 mb-6">{stock.exchange}</p>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
            <StockChart 
              symbol={stock.symbol} 
              name={stock.name}
              prices={prices || { daily: [], weekly: [], monthly: [], yearly: [] }}
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
} 