'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSearch } from '@/lib/utils/searchContext';
import { SearchResult } from '@/types';

export const SearchBar: React.FC = () => {
  const { searchTerm, setSearchTerm, searchResults, isLoading } = useSearch();
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  // Handle click outside to close results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Handle search input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowResults(value.length > 0);
  };
  
  // Handle search result selection
  const handleResultClick = (result: SearchResult) => {
    setSearchTerm(result.symbol);
    setShowResults(false);
    router.push(`/stock/${result.symbol}`);
  };
  
  // Handle search submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (searchTerm.trim()) {
      router.push(`/stock/${searchTerm.trim()}`);
    }
  };
  
  return (
    <div className="relative w-full max-w-2xl mx-auto" ref={searchRef}>
      <form onSubmit={handleSubmit} className="flex w-full">
        <Input
          type="text"
          placeholder="Search for a company or symbol..."
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setShowResults(searchTerm.length > 0)}
          className="w-full rounded-r-none focus-visible:ring-2 focus-visible:ring-offset-2"
        />
        <Button type="submit" className="rounded-l-none">
          Search
        </Button>
      </form>
      
      {showResults && searchResults.length > 0 && (
        <Card className="absolute z-50 w-full mt-1 max-h-80 overflow-y-auto">
          <ul className="py-2">
            {searchResults.map((result) => (
              <li
                key={result.symbol}
                className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                onClick={() => handleResultClick(result)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{result.symbol}</span>
                  <span className="text-sm text-gray-500">{result.name}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      
      {isLoading && (
        <div className="absolute right-16 top-3">
          <div className="animate-spin h-5 w-5 border-2 border-gray-500 rounded-full border-t-transparent"></div>
        </div>
      )}
    </div>
  );
}; 