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

// Initialize Redis client if REDIS_URL is available and we're on the server
let redisClient: any = null;
let isRedisConnecting = false;
let redisConnectionFailed = false;

// Only import Redis on the server side
if (typeof window === 'undefined') {
  initRedisConnection();
}

async function initRedisConnection() {
  if (isRedisConnecting || redisClient) return;
  
  isRedisConnecting = true;
  
  try {
    // We're on the server
    const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
    
    if (!REDIS_URL) {
      console.log('No REDIS_URL provided, using in-memory cache');
      isRedisConnecting = false;
      redisConnectionFailed = true;
      return;
    }
    
    const Redis = await import('ioredis').catch(err => {
      console.error('Failed to import ioredis:', err);
      redisConnectionFailed = true;
      return null;
    });
    
    if (!Redis) {
      isRedisConnecting = false;
      return;
    }
    
    try {
      redisClient = new Redis.default(REDIS_URL, {
        maxRetriesPerRequest: 3,
        connectTimeout: 5000,
        enableOfflineQueue: true,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        }
      });
      
      redisClient.on('error', (err: Error) => {
        console.error('Redis connection error:', err);
        if (redisClient && !redisConnectionFailed) {
          redisConnectionFailed = true;
          console.log('Falling back to in-memory cache due to Redis error');
        }
      });
      
      redisClient.on('connect', () => {
        console.log('Connected to Redis server');
        redisConnectionFailed = false;
      });
      
      redisClient.on('reconnecting', () => {
        console.log('Reconnecting to Redis server...');
      });
      
      // Test connection
      await redisClient.ping().then(() => {
        console.log('Redis server is responsive');
      }).catch((err: Error) => {
        console.error('Redis ping failed:', err);
        redisConnectionFailed = true;
      });
    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      redisClient = null;
      redisConnectionFailed = true;
    }
  } finally {
    isRedisConnecting = false;
  }
}

/**
 * Check if Redis is available
 */
function isRedisAvailable(): boolean {
  return !!redisClient && !redisConnectionFailed;
}

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
  if (!isRedisAvailable() && memoryCacheSize + newItemSize > MAX_CACHE_SIZE) {
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
    
    if (isRedisAvailable()) {
      // Use Redis for caching
      try {
        const serializedValue = JSON.stringify({ value, expiry });
        await redisClient.set(key, serializedValue);
        
        if (ttl > 0) {
          await redisClient.expire(key, ttl);
        }
        
        console.log(`Redis cache set: ${key} (expires in ${ttl}s)`);
        return;
      } catch (redisError) {
        console.error(`Redis error when setting ${key}:`, redisError);
        // Fall through to in-memory cache
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
    if (isRedisAvailable()) {
      // Try to get from Redis
      try {
        const cachedData = await redisClient.get(key);
        
        if (!cachedData) {
          console.log(`Redis cache miss: ${key}`);
          return null;
        }
        
        const parsed = JSON.parse(cachedData) as CacheValue<T>;
        
        // Check if cache has expired
        if (parsed.expiry < Date.now()) {
          console.log(`Redis cache expired: ${key}`);
          await redisClient.del(key);
          return null;
        }
        
        console.log(`Redis cache hit: ${key}`);
        return parsed.value;
      } catch (redisError) {
        console.error(`Redis error when getting ${key}:`, redisError);
        // Fall through to in-memory cache
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
    if (isRedisAvailable()) {
      try {
        await redisClient.del(key);
        console.log(`Redis cache deleted: ${key}`);
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
    if (isRedisAvailable()) {
      try {
        await redisClient.flushdb();
        console.log('Redis cache cleared');
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
    if (isRedisAvailable()) {
      try {
        const info = await redisClient.info('memory');
        const dbSize = await redisClient.dbsize();
        
        // Parse memory info
        const usedMemoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
        const usedMemory = usedMemoryMatch ? usedMemoryMatch[1].trim() : 'unknown';
        
        return {
          type: 'redis',
          keys: dbSize,
          memory: usedMemory,
          redisAvailable: true
        };
      } catch (redisError) {
        console.error('Redis error when getting stats:', redisError);
        // Fall through to in-memory stats
      }
    }
    
    return {
      type: 'memory',
      size: memoryCacheSize,
      keys: Object.keys(memoryCache).length,
      redisAvailable: isRedisAvailable()
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