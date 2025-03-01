/**
 * Simplified cache service that works in both browser and server environments
 * This version uses in-memory caching for the browser and avoids Node.js specific modules
 */

// Default cache TTL in seconds
const DEFAULT_CACHE_TTL = parseInt(process.env.CACHE_TTL || '86400', 10); // 24 hours

// In-memory cache storage
const memoryCache: Record<string, { value: any; expiry: number }> = {};

/**
 * Set a value in the cache with optional TTL
 */
export async function set(key: string, value: any, ttl = DEFAULT_CACHE_TTL): Promise<void> {
  try {
    // Store in memory cache
    const expiry = ttl > 0 ? Date.now() + (ttl * 1000) : Infinity;
    memoryCache[key] = { value, expiry };
    
    // Log cache operation
    console.log(`Cache set: ${key} (expires in ${ttl}s)`);
  } catch (error) {
    console.error(`Error setting cache for key ${key}:`, error);
  }
}

/**
 * Get a value from the cache
 */
export async function get<T>(key: string): Promise<T | null> {
  try {
    const cached = memoryCache[key];
    
    // Check if cache exists and is still valid
    if (!cached) {
      console.log(`Cache miss: ${key}`);
      return null;
    }
    
    // Check if cache has expired
    if (cached.expiry < Date.now()) {
      console.log(`Cache expired: ${key}`);
      delete memoryCache[key];
      return null;
    }
    
    console.log(`Cache hit: ${key}`);
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
    delete memoryCache[key];
    console.log(`Cache deleted: ${key}`);
  } catch (error) {
    console.error(`Error deleting cache for key ${key}:`, error);
  }
}

/**
 * Clear the entire cache
 */
export async function clear(): Promise<void> {
  try {
    Object.keys(memoryCache).forEach(key => {
      delete memoryCache[key];
    });
    console.log('Cache cleared');
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

// Export functions individually
const cacheService = {
  set,
  get,
  delete: del,
  clear
};

export default cacheService; 