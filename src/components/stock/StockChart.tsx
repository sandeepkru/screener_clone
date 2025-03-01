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

export default function StockChart({ symbol, name, prices }: StockChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('1D');
  
  // Get the appropriate price data based on the selected time range
  const getPriceData = () => {
    switch (timeRange) {
      case '1D':
        return prices.daily;
      case '1W':
        return prices.weekly;
      case '1M':
      case '3M':
        return prices.monthly;
      case '1Y':
      case '5Y':
        return prices.yearly;
      default:
        return prices.daily;
    }
  };
  
  const priceData = getPriceData();
  
  // Calculate price change
  const calculatePriceChange = () => {
    if (!priceData || priceData.length < 2) {
      return { change: 0, percentChange: 0 };
    }
    
    const firstPrice = priceData[0].price;
    const lastPrice = priceData[priceData.length - 1].price;
    const change = lastPrice - firstPrice;
    const percentChange = (change / firstPrice) * 100;
    
    return { change, percentChange };
  };
  
  const { change, percentChange } = calculatePriceChange();
  const isPositive = change >= 0;
  
  // Format the date for the tooltip based on the time range
  const formatTooltipDate = (date: string) => {
    const dateObj = new Date(date);
    
    if (timeRange === '1D') {
      return formatDateTime(dateObj);
    } else {
      return formatDate(dateObj);
    }
  };
  
  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { date: string }; value: number }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formatTooltipDate(payload[0].payload.date)}
          </p>
          <p className="text-sm font-semibold">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">{formatCurrency(priceData[priceData.length - 1]?.price || 0)}</h2>
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
                const dateObj = new Date(date);
                if (timeRange === '1D') {
                  return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } else if (timeRange === '1W') {
                  return dateObj.toLocaleDateString([], { weekday: 'short' });
                } else {
                  return dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
                }
              }}
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
            <ReferenceLine y={priceData[0]?.price} stroke="#374151" strokeDasharray="3 3" />
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