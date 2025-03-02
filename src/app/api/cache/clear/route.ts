import { NextResponse } from 'next/server';
import cacheService from '@/lib/cache/cacheService';

export const dynamic = 'force-dynamic'; // No caching for this route

export async function POST() {
  try {
    await cacheService.clear();
    
    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear cache'
      },
      { status: 500 }
    );
  }
} 