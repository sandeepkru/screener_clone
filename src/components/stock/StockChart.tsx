'use client';

import React, { useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StockPrice, TimeRange } from '@/types';
import { useStockStore } from '@/store/stockStore';

interface StockChartProps {
  prices: StockPrice[];
  symbol: string;
}

export const StockChart: React.FC<StockChartProps> = ({ prices, symbol }) => {
  const { selectedTimeRange, setTimeRange } = useStockStore();
  
  // Debug: Log the prices data
  useEffect(() => {
    console.log('StockChart prices:', prices);
    console.log('StockChart symbol:', symbol);
    console.log('StockChart selectedTimeRange:', selectedTimeRange);
  }, [prices, symbol, selectedTimeRange]);
  
  // Format data for the chart
  const chartData = prices && prices.length > 0 ? prices.map((price) => {
    const date = new Date(price.timestamp);
    
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      price: price.close,
      open: price.open,
      high: price.high,
      low: price.low,
      volume: price.volume,
    };
  }) : [];
  
  // Debug: Log the formatted chart data
  useEffect(() => {
    console.log('StockChart chartData:', chartData);
  }, [chartData]);
  
  // Calculate price change
  const calculatePriceChange = () => {
    if (!prices || prices.length < 2) return { change: 0, percentChange: 0 };
    
    const firstPrice = prices[0].close;
    const lastPrice = prices[prices.length - 1].close;
    const change = lastPrice - firstPrice;
    const percentChange = (change / firstPrice) * 100;
    
    return { change, percentChange };
  };
  
  const { change, percentChange } = calculatePriceChange();
  const isPositive = change >= 0;
  
  // Format price for display
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };
  
  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded shadow-lg">
          <p className="text-gray-500">{`${label} ${payload[0].payload.time}`}</p>
          <p className="font-bold">{`Price: ${formatPrice(payload[0].value)}`}</p>
          <p>{`Open: ${formatPrice(payload[0].payload.open)}`}</p>
          <p>{`High: ${formatPrice(payload[0].payload.high)}`}</p>
          <p>{`Low: ${formatPrice(payload[0].payload.low)}`}</p>
          <p>{`Volume: ${payload[0].payload.volume.toLocaleString()}`}</p>
        </div>
      );
    }
    
    return null;
  };
  
  // Time range options
  const timeRanges: { value: TimeRange; label: string }[] = [
    { value: '1D', label: '1D' },
    { value: '1W', label: '1W' },
    { value: '1M', label: '1M' },
    { value: '3M', label: '3M' },
    { value: '1Y', label: '1Y' },
    { value: '5Y', label: '5Y' },
  ];
  
  // If no prices data, show a loading state
  if (!prices || prices.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle>{symbol} Stock Price</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent mx-auto mb-4"></div>
            <p>Loading chart data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>{symbol} Stock Price</CardTitle>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {formatPrice(prices[prices.length - 1]?.close || 0)}
            </div>
            <div
              className={`text-sm ${
                isPositive ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {isPositive ? '+' : ''}
              {formatPrice(change)} ({isPositive ? '+' : ''}
              {percentChange.toFixed(2)}%)
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue={selectedTimeRange}
          value={selectedTimeRange}
          onValueChange={(value) => setTimeRange(value as TimeRange)}
          className="w-full"
        >
          <TabsList className="mb-4">
            {timeRanges.map((range) => (
              <TabsTrigger key={range.value} value={range.value}>
                {range.label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={isPositive ? '#10b981' : '#ef4444'}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={isPositive ? '#10b981' : '#ef4444'}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    // Format based on time range
                    if (selectedTimeRange === '1D') {
                      return chartData.find((d) => d.date === value)?.time.substring(0, 5) || '';
                    }
                    return value;
                  }}
                />
                <YAxis
                  domain={['dataMin', 'dataMax']}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatPrice(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={isPositive ? '#10b981' : '#ef4444'}
                  fillOpacity={1}
                  fill="url(#colorPrice)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}; 