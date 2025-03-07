import { NextResponse } from 'next/server';
import cacheService from '@/lib/cache/cacheService';

export const dynamic = 'force-dynamic'; // No caching for this route

export async function GET() {
  try {
    const stats = await cacheService.getStats();
    
    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch cache statistics'
      },
      { status: 500 }
    );
  }
} 