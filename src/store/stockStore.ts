import { create } from 'zustand';
import { StockData, TimeRange } from '@/types';
import { getStockData } from '@/lib/api/stockApi';

interface StockState {
  // Current stock data
  currentStock: StockData | null;
  isLoading: boolean;
  error: string | null;
  
  // Selected time range
  selectedTimeRange: TimeRange;
  
  // Search history
  searchHistory: string[];
  
  // Actions
  fetchStockData: (symbol: string) => Promise<void>;
  setTimeRange: (range: TimeRange) => void;
  addToSearchHistory: (symbol: string) => void;
  clearSearchHistory: () => void;
}

export const useStockStore = create<StockState>((set, get) => ({
  // Initial state
  currentStock: null,
  isLoading: false,
  error: null,
  selectedTimeRange: '1D',
  searchHistory: [],
  
  // Actions
  fetchStockData: async (symbol: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await getStockData(symbol);
      
      if (response.success && response.data) {
        // Initialize with the correct prices based on current selected time range
        const { selectedTimeRange } = get();
        let prices;
        
        switch (selectedTimeRange) {
          case '1D':
            prices = response.data.dailyPrices;
            break;
          case '1W':
            prices = response.data.weeklyPrices;
            break;
          case '1M':
          case '3M':
            prices = response.data.monthlyPrices;
            break;
          case '1Y':
          case '5Y':
            prices = response.data.yearlyPrices;
            break;
          default:
            prices = response.data.dailyPrices;
        }
        
        set({ 
          currentStock: {
            ...response.data,
            prices: prices
          },
          isLoading: false,
        });
        
        // Add to search history
        get().addToSearchHistory(symbol);
      } else {
        set({ 
          error: response.error || 'Failed to fetch stock data',
          isLoading: false,
        });
      }
    } catch (error) {
      set({ 
        error: 'An unexpected error occurred',
        isLoading: false,
      });
    }
  },
  
  setTimeRange: (range: TimeRange) => {
    const { currentStock } = get();
    
    if (!currentStock) return;
    
    let prices;
    
    switch (range) {
      case '1D':
        prices = currentStock.dailyPrices;
        break;
      case '1W':
        prices = currentStock.weeklyPrices;
        break;
      case '1M':
      case '3M':
        prices = currentStock.monthlyPrices;
        break;
      case '1Y':
      case '5Y':
        prices = currentStock.yearlyPrices;
        break;
      default:
        prices = currentStock.dailyPrices;
    }
    
    console.log(`Setting time range to ${range} with ${prices.length} price points`);
    
    set({
      selectedTimeRange: range,
      currentStock: {
        ...currentStock,
        prices: prices
      }
    });
  },
  
  addToSearchHistory: (symbol: string) => {
    const { searchHistory } = get();
    
    // Don't add duplicates
    if (!searchHistory.includes(symbol.toUpperCase())) {
      // Keep only the last 10 searches
      const newHistory = [symbol.toUpperCase(), ...searchHistory].slice(0, 10);
      set({ searchHistory: newHistory });
      
      // Save to localStorage for persistence
      try {
        localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      } catch (error) {
        console.error('Failed to save search history to localStorage:', error);
      }
    }
  },
  
  clearSearchHistory: () => {
    set({ searchHistory: [] });
    
    // Clear from localStorage
    try {
      localStorage.removeItem('searchHistory');
    } catch (_error) {
      console.error('Failed to clear search history from localStorage:');
    }
  },
})); 