'use client';

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { StockChart } from '@/components/stock/StockChart';
import { CompanyDetails } from '@/components/stock/CompanyDetails';
import { useStockStore } from '@/store/stockStore';
import { toast } from 'sonner';

export default function StockPage() {
  const params = useParams();
  const symbol = params.symbol as string;
  
  const { currentStock, isLoading, error, fetchStockData } = useStockStore();
  
  useEffect(() => {
    if (symbol) {
      console.log('Fetching stock data for:', symbol);
      fetchStockData(symbol);
    }
  }, [symbol, fetchStockData]);
  
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);
  
  useEffect(() => {
    if (currentStock) {
      console.log('Current stock data:', {
        symbol: currentStock.company.symbol,
        name: currentStock.company.name,
        pricesLength: currentStock.prices.length,
        dailyPricesLength: currentStock.dailyPrices.length,
        weeklyPricesLength: currentStock.weeklyPrices.length,
        monthlyPricesLength: currentStock.monthlyPrices.length,
        yearlyPricesLength: currentStock.yearlyPrices.length,
      });
    }
  }, [currentStock]);
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      </div>
    );
  }
  
  if (!currentStock && !isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Stock Not Found</h1>
          <p>We couldn't find any information for the symbol {symbol}.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {currentStock && (
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold">{currentStock.company.name}</h1>
            <p className="text-gray-500">{currentStock.company.symbol}</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <StockChart prices={currentStock.prices} symbol={currentStock.company.symbol} />
            </div>
            
            <div>
              <CompanyDetails company={currentStock.company} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 