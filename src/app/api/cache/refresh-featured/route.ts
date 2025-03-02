import { NextResponse } from 'next/server';
import { prefetchFeaturedStocks } from '@/lib/cache/prefetch';

export const dynamic = 'force-dynamic'; // No caching for this route

export async function GET() {
  try {
    await prefetchFeaturedStocks();
    
    return NextResponse.json({
      success: true,
      message: 'Featured stocks cache refreshed successfully'
    });
  } catch (error) {
    console.error('Error refreshing featured stocks cache:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to refresh featured stocks cache'
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET(); // Support both GET and POST methods
} 