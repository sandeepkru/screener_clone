import { NextResponse } from 'next/server';
import { getCachedFeaturedStocks, prefetchFeaturedStocks } from '@/lib/cache/prefetch';

export async function GET() {
  try {
    // Try to get cached featured stocks
    let featuredStocks = await getCachedFeaturedStocks();
    
    // If no cached data, try to prefetch it
    if (!featuredStocks || featuredStocks.length === 0) {
      console.log('No cached featured stocks found, prefetching...');
      await prefetchFeaturedStocks();
      featuredStocks = await getCachedFeaturedStocks();
    }
    
    // If still no data, return an empty array
    if (!featuredStocks) {
      featuredStocks = [];
    }
    
    return NextResponse.json({
      success: true,
      data: featuredStocks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching featured stocks:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch featured stocks',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 