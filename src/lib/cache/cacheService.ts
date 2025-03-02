/**
 * Enhanced cache service that works with Redis and falls back to in-memory caching
 * This version supports both Redis for production and in-memory for development
 */

// Define a generic type for cache values
type CacheValue<T> = {
  value: T;
  expiry: number;
};

// Default cache TTL in seconds
const DEFAULT_CACHE_TTL = parseInt(process.env.CACHE_TTL || '86400', 10); // 24 hours

// Maximum cache size in bytes (30MB)
const MAX_CACHE_SIZE = 30 * 1024 * 1024;

// In-memory cache storage as fallback
const memoryCache: Record<string, CacheValue<unknown>> = {};
let memoryCacheSize = 0;

// Flag to track if we're in a server environment
const isServer = typeof window === 'undefined';

/**
 * Estimate the size of an object in bytes
 */
function estimateSize(obj: unknown): number {
  const str = JSON.stringify(obj);
  // UTF-16 characters are 2 bytes each
  return str.length * 2;
}

/**
 * Enforce cache size limit for in-memory cache
 */
function enforceSizeLimit(newItemSize: number): void {
  if (memoryCacheSize + newItemSize > MAX_CACHE_SIZE) {
    // Simple LRU-like eviction: remove oldest entries first
    const entries = Object.entries(memoryCache);
    entries.sort((a, b) => (a[1].expiry - b[1].expiry));
    
    while (memoryCacheSize + newItemSize > MAX_CACHE_SIZE && entries.length > 0) {
      const [key, value] = entries.shift()!;
      const itemSize = estimateSize(value);
      delete memoryCache[key];
      memoryCacheSize -= itemSize;
      console.log(`Cache evicted: ${key} (size: ${itemSize} bytes)`);
    }
  }
}

/**
 * Set a value in the cache with optional TTL
 */
export async function set<T>(key: string, value: T, ttl = DEFAULT_CACHE_TTL): Promise<void> {
  try {
    const expiry = ttl > 0 ? Date.now() + (ttl * 1000) : Infinity;
    
    // Try Redis first if we're on the server
    if (isServer) {
      try {
        // Dynamically import the server-side Redis implementation
        const redisCacheModule = await import('./redisCache.server');
        const redisResult = await redisCacheModule.setRedisCache(key, value, ttl);
        
        if (redisResult) {
          // Successfully stored in Redis
          return;
        }
      } catch (redisError) {
        // Redis failed, fall back to memory cache
        console.error(`Redis error when setting ${key}:`, redisError);
      }
    }
    
    // Fallback to memory cache
    const itemSize = estimateSize({ value, expiry });
    enforceSizeLimit(itemSize);
    
    memoryCache[key] = { value, expiry };
    memoryCacheSize += itemSize;
    
    console.log(`Memory cache set: ${key} (expires in ${ttl}s, size: ${itemSize} bytes)`);
  } catch (error) {
    console.error(`Error setting cache for key ${key}:`, error);
  }
}

/**
 * Get a value from the cache
 */
export async function get<T>(key: string): Promise<T | null> {
  try {
    // Try Redis first if we're on the server
    if (isServer) {
      try {
        // Dynamically import the server-side Redis implementation
        const redisCacheModule = await import('./redisCache.server');
        const redisValue = await redisCacheModule.getRedisCache<T>(key);
        
        if (redisValue !== null) {
          // Successfully retrieved from Redis
          return redisValue;
        }
      } catch (redisError) {
        // Redis failed, fall back to memory cache
        console.error(`Redis error when getting ${key}:`, redisError);
      }
    }
    
    // Fallback to memory cache
    const cached = memoryCache[key];
    
    // Check if cache exists and is still valid
    if (!cached) {
      console.log(`Memory cache miss: ${key}`);
      return null;
    }
    
    // Check if cache has expired
    if (cached.expiry < Date.now()) {
      console.log(`Memory cache expired: ${key}`);
      const itemSize = estimateSize(cached);
      delete memoryCache[key];
      memoryCacheSize -= itemSize;
      return null;
    }
    
    console.log(`Memory cache hit: ${key}`);
    return cached.value as T;
  } catch (error) {
    console.error(`Error getting cache for key ${key}:`, error);
    return null;
  }
}

/**
 * Delete a value from the cache
 */
export async function del(key: string): Promise<void> {
  try {
    // Try Redis first if we're on the server
    if (isServer) {
      try {
        // Dynamically import the server-side Redis implementation
        const redisCacheModule = await import('./redisCache.server');
        await redisCacheModule.deleteRedisCache(key);
      } catch (redisError) {
        console.error(`Redis error when deleting ${key}:`, redisError);
      }
    }
    
    // Always check memory cache too
    if (memoryCache[key]) {
      const itemSize = estimateSize(memoryCache[key]);
      delete memoryCache[key];
      memoryCacheSize -= itemSize;
      console.log(`Memory cache deleted: ${key} (freed ${itemSize} bytes)`);
    }
  } catch (error) {
    console.error(`Error deleting cache for key ${key}:`, error);
  }
}

/**
 * Clear the entire cache
 */
export async function clear(): Promise<void> {
  try {
    // Try Redis first if we're on the server
    if (isServer) {
      try {
        // Dynamically import the server-side Redis implementation
        const redisCacheModule = await import('./redisCache.server');
        await redisCacheModule.clearRedisCache();
      } catch (redisError) {
        console.error('Redis error when clearing cache:', redisError);
      }
    }
    
    // Always clear memory cache too
    Object.keys(memoryCache).forEach(key => {
      delete memoryCache[key];
    });
    memoryCacheSize = 0;
    console.log('Memory cache cleared');
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getStats(): Promise<{
  type: 'redis' | 'memory';
  size?: number;
  keys?: number;
  memory?: string;
  redisAvailable?: boolean;
}> {
  try {
    // Try Redis first if we're on the server
    if (isServer) {
      try {
        // Dynamically import the server-side Redis implementation
        const redisCacheModule = await import('./redisCache.server');
        const redisStats = await redisCacheModule.getRedisStats();
        
        if (redisStats) {
          return {
            ...redisStats,
            redisAvailable: true
          };
        }
      } catch (redisError) {
        console.error('Redis error when getting stats:', redisError);
      }
    }
    
    // Fallback to memory cache stats
    return {
      type: 'memory',
      size: memoryCacheSize,
      keys: Object.keys(memoryCache).length,
      redisAvailable: false
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      type: 'memory',
      size: memoryCacheSize,
      redisAvailable: false
    };
  }
}

// Export functions individually
const cacheService = {
  set,
  get,
  delete: del,
  clear,
  getStats
};

export default cacheService; 