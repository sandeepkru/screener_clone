'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Trie } from './trie';
import { searchStocks } from '@/lib/api/stockApi';
import { SearchResult } from '@/types';

interface SearchContextType {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchResults: SearchResult[];
  isLoading: boolean;
  error: string | null;
  trie: Trie | null;
}

const SearchContext = createContext<SearchContextType>({
  searchTerm: '',
  setSearchTerm: () => {},
  searchResults: [],
  isLoading: false,
  error: null,
  trie: null,
});

export const useSearch = () => useContext(SearchContext);

// Default mock search results to use when API fails
const defaultSearchResults: SearchResult[] = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'META', name: 'Meta Platforms Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'NFLX', name: 'Netflix Inc.' }
];

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trie, setTrie] = useState<Trie | null>(null);
  const [initialized, setInitialized] = useState(false);
  
  // Initialize the trie with company data only once
  useEffect(() => {
    if (initialized) return;
    
    const initializeTrie = async () => {
      try {
        setIsLoading(true);
        
        // Create a new trie with default search results
        const newTrie = Trie.buildFromCompanies(defaultSearchResults);
        setTrie(newTrie);
        setInitialized(true);
        
        // Try to get more companies from API in the background
        try {
          const response = await searchStocks('');
          
          if (response.success && response.data && response.data.length > 0) {
            const updatedTrie = Trie.buildFromCompanies(response.data);
            setTrie(updatedTrie);
          }
        } catch (apiError) {
          console.error('Error fetching companies for search:', apiError);
          // Keep using the default trie
        }
        
        setIsLoading(false);
      } catch (_error) {
        console.error('Error initializing search:', _error);
        setError('An unexpected error occurred');
        setIsLoading(false);
      }
    };
    
    initializeTrie();
  }, [initialized]);
  
  // Memoized search function to prevent recreating on each render
  const performSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // First try to use the trie for fast local search
      if (trie) {
        const trieResults = trie.search(term);
        
        if (trieResults.length > 0) {
          setSearchResults(trieResults);
          setIsLoading(false);
          return;
        }
      }
      
      // Fall back to API search if trie doesn't have results
      try {
        const response = await searchStocks(term);
        
        if (response.success && response.data) {
          const results: SearchResult[] = response.data.map(company => ({
            symbol: company.symbol,
            name: company.name,
          }));
          
          setSearchResults(results);
        } else {
          // If API fails, filter default results
          const filteredResults = defaultSearchResults.filter(
            result => 
              result.symbol.toLowerCase().includes(term.toLowerCase()) || 
              result.name.toLowerCase().includes(term.toLowerCase())
          );
          setSearchResults(filteredResults);
        }
      } catch (apiError) {
        console.error('API search error:', apiError);
        // If API fails, filter default results
        const filteredResults = defaultSearchResults.filter(
          result => 
            result.symbol.toLowerCase().includes(term.toLowerCase()) || 
            result.name.toLowerCase().includes(term.toLowerCase())
        );
        setSearchResults(filteredResults);
      }
    } catch (_error) {
      console.error('Search error:', _error);
      setError('An unexpected error occurred');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [trie]);
  
  // Search for companies when the search term changes
  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      performSearch(searchTerm);
    }, 300);
    
    return () => clearTimeout(debounceTimeout);
  }, [searchTerm, performSearch]);
  
  return (
    <SearchContext.Provider
      value={{
        searchTerm,
        setSearchTerm,
        searchResults,
        isLoading,
        error,
        trie,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}; 