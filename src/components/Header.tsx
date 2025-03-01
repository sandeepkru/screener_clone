'use client';

import React from 'react';
import Link from 'next/link';
import { SearchBar } from './stock/SearchBar';

export const Header: React.FC = () => {
  return (
    <header className="bg-white dark:bg-gray-900 border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              StockScreener
            </Link>
          </div>
          
          <div className="w-full md:w-auto flex-1 max-w-2xl">
            <SearchBar />
          </div>
          
          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Get Free Account
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}; 