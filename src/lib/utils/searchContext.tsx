'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Trie } from './trie';
import { searchCompanies } from '@/lib/api/stockApi';
import { Company, SearchResult } from '@/types';

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

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trie, setTrie] = useState<Trie | null>(null);
  
  // Initialize the trie with company data
  useEffect(() => {
    const initializeTrie = async () => {
      try {
        setIsLoading(true);
        
        // In a real application, you would fetch all companies from an API
        // For now, we'll use our mock search to get some companies
        const response = await searchCompanies('');
        
        if (response.success && response.data) {
          const newTrie = Trie.buildFromCompanies(response.data);
          setTrie(newTrie);
        } else {
          setError('Failed to initialize search');
        }
        
        setIsLoading(false);
      } catch (error) {
        setError('An unexpected error occurred');
        setIsLoading(false);
      }
    };
    
    initializeTrie();
  }, []);
  
  // Search for companies when the search term changes
  useEffect(() => {
    const performSearch = async () => {
      if (!searchTerm.trim()) {
        setSearchResults([]);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        // First try to use the trie for fast local search
        if (trie) {
          const trieResults = trie.search(searchTerm);
          
          if (trieResults.length > 0) {
            setSearchResults(trieResults);
            setIsLoading(false);
            return;
          }
        }
        
        // Fall back to API search if trie doesn't have results
        const response = await searchCompanies(searchTerm);
        
        if (response.success && response.data) {
          const results: SearchResult[] = response.data.map(company => ({
            symbol: company.symbol,
            name: company.name,
          }));
          
          setSearchResults(results);
        } else {
          setError(response.error || 'Search failed');
          setSearchResults([]);
        }
      } catch (error) {
        setError('An unexpected error occurred');
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Debounce search to avoid too many requests
    const debounceTimeout = setTimeout(performSearch, 300);
    
    return () => clearTimeout(debounceTimeout);
  }, [searchTerm, trie]);
  
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