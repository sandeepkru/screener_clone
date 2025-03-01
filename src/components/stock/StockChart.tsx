'use client';

import { useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { StockPrices, TimeRange } from '@/types/stock';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils/formatters';

interface StockChartProps {
  symbol: string;
  name: string;
  prices: StockPrices;
}

export default function StockChart({ prices }: Omit<StockChartProps, 'symbol' | 'name'>) {
  const [timeRange, setTimeRange] = useState<TimeRange>('1D');
  
  // Ensure prices is always a valid object
  const safetyPrices = prices || {
    daily: [],
    weekly: [],
    monthly: [],
    threeMonth: [],
    yearly: [],
    fiveYear: []
  };
  
  // Get the appropriate price data based on the selected time range
  const getPriceData = () => {
    try {
      switch (timeRange) {
        case '1D':
          return safetyPrices.daily || [];
        case '1W':
          return safetyPrices.weekly || [];
        case '1M':
          return safetyPrices.monthly || [];
        case '3M':
          return safetyPrices.threeMonth || [];
        case '1Y':
          return safetyPrices.yearly || [];
        case '5Y':
          return safetyPrices.fiveYear || [];
        default:
          return safetyPrices.daily || [];
      }
    } catch (error) {
      console.error('Error getting price data:', error);
      return [];
    }
  };
  
  const priceData = getPriceData();
  
  // Calculate price change
  const calculatePriceChange = () => {
    try {
      if (!priceData || priceData.length < 2) {
        return { change: 0, percentChange: 0 };
      }
      
      const firstPrice = priceData[0]?.price || 0;
      const lastPrice = priceData[priceData.length - 1]?.price || 0;
      
      // Prevent division by zero
      if (firstPrice === 0) {
        return { change: 0, percentChange: 0 };
      }
      
      const change = lastPrice - firstPrice;
      const percentChange = (change / firstPrice) * 100;
      
      return { change, percentChange };
    } catch (error) {
      console.error('Error calculating price change:', error);
      return { change: 0, percentChange: 0 };
    }
  };
  
  const { change, percentChange } = calculatePriceChange();
  const isPositive = change >= 0;
  
  // Format the date for the tooltip based on the time range
  const formatTooltipDate = (date: string) => {
    if (!date) return '';
    
    try {
      const dateObj = new Date(date);
      
      if (timeRange === '1D') {
        return formatDateTime(dateObj);
      } else {
        return formatDate(dateObj);
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };
  
  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { date: string }; value: number }> }) => {
    if (active && payload && payload.length && payload[0]?.payload?.date) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formatTooltipDate(payload[0].payload.date)}
          </p>
          <p className="text-sm font-semibold">
            {formatCurrency(payload[0].value || 0)}
          </p>
        </div>
      );
    }
    
    return null;
  };
  
  // If there's no price data, show a message
  if (!priceData || priceData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80">
        <p className="text-gray-500">No price data available for this time range.</p>
        <div className="flex space-x-2 mt-4">
          {(['1D', '1W', '1M', '3M', '1Y', '5Y'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm rounded-md ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
    );
  }
  
  // Get the latest price safely
  const latestPrice = priceData[priceData.length - 1]?.price || 0;
  
  // Get the reference price (first price) safely
  const referencePrice = priceData[0]?.price;
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">{formatCurrency(latestPrice)}</h2>
          <div className={`flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            <span className="font-medium">
              {isPositive ? '+' : ''}{formatCurrency(change)}
            </span>
            <span className="ml-2">
              ({isPositive ? '+' : ''}{percentChange.toFixed(2)}%)
            </span>
          </div>
        </div>
        
        <div className="flex space-x-2">
          {(['1D', '1W', '1M', '3M', '1Y', '5Y'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm rounded-md ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={priceData}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => {
                if (!date) return '';
                
                try {
                  const dateObj = new Date(date);
                  switch (timeRange) {
                    case '1D':
                      return dateObj.toLocaleTimeString([], { hour: 'numeric' });
                    case '1W':
                      return dateObj.toLocaleDateString([], { weekday: 'short' });
                    case '1M':
                      return dateObj.getDate() === 1 || dateObj.getDate() === 15 
                        ? dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' })
                        : dateObj.getDate().toString();
                    case '3M':
                      return dateObj.getDate() === 1
                        ? dateObj.toLocaleDateString([], { month: 'short' })
                        : '';
                    case '1Y':
                      return dateObj.getMonth() % 2 === 0
                        ? dateObj.toLocaleDateString([], { month: 'short' })
                        : '';
                    case '5Y':
                      return dateObj.getMonth() === 0
                        ? dateObj.toLocaleDateString([], { year: 'numeric' })
                        : dateObj.getMonth() === 6
                          ? 'Jul'
                          : '';
                    default:
                      return dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
                  }
                } catch (error) {
                  console.error('Error formatting X-axis date:', error);
                  return '';
                }
              }}
              interval="preserveStartEnd"
              minTickGap={30}
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#374151', opacity: 0.3 }}
              tickLine={{ stroke: '#374151', opacity: 0.3 }}
            />
            <YAxis 
              domain={['auto', 'auto']}
              tickFormatter={(value) => formatCurrency(value).replace('.00', '')}
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#374151', opacity: 0.3 }}
              tickLine={{ stroke: '#374151', opacity: 0.3 }}
            />
            <Tooltip content={<CustomTooltip />} />
            {referencePrice && <ReferenceLine y={referencePrice} stroke="#374151" strokeDasharray="3 3" />}
            <Line
              type="monotone"
              dataKey="price"
              stroke={isPositive ? '#10B981' : '#EF4444'}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 