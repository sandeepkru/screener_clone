/**
 * Server-side initialization script
 * This file is imported in app/layout.tsx to run on server start
 */

import { prefetchFeaturedStocks } from './cache/prefetch';

// Only run on server
if (typeof window === 'undefined') {
  console.log('Initializing server-side services...');
  
  // Run after a short delay to ensure Redis connection is established
  setTimeout(async () => {
    try {
      console.log('Pre-caching featured stocks on server start...');
      await prefetchFeaturedStocks();
      console.log('Featured stocks pre-caching completed');
    } catch (error) {
      console.error('Error pre-caching featured stocks:', error);
    }
  }, 5000);
}

export default function initServer() {
  // This function is called in app/layout.tsx
  // It doesn't need to do anything as the initialization happens when the module is imported
  return null;
} 