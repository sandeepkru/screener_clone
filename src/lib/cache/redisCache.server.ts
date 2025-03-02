/**
 * Server-only Redis implementation
 * This file should only be imported on the server side
 */

import { Redis } from 'ioredis';

// Define a generic type for cache values
type CacheValue<T> = {
  value: T;
  expiry: number;
};

// Redis client instance
let redisClient: Redis | null = null;
let isRedisConnecting = false;
let redisConnectionFailed = false;

/**
 * Initialize Redis connection if not already connected
 */
async function getRedisClient(): Promise<Redis | null> {
  if (redisClient) return redisClient;
  if (redisConnectionFailed) return null;
  if (isRedisConnecting) {
    // Wait for the connection attempt to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    return redisClient;
  }
  
  isRedisConnecting = true;
  
  try {
    const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
    
    if (!REDIS_URL) {
      console.log('No REDIS_URL provided, using in-memory cache');
      redisConnectionFailed = true;
      return null;
    }
    
    redisClient = new Redis(REDIS_URL, {
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
      redisClient = null;
    });
    
    return redisClient;
  } catch (error) {
    console.error('Failed to initialize Redis client:', error);
    redisConnectionFailed = true;
    redisClient = null;
    return null;
  } finally {
    isRedisConnecting = false;
  }
}

/**
 * Set a value in Redis cache
 */
export async function setRedisCache<T>(key: string, value: T, ttl: number): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return false;
  
  try {
    const expiry = ttl > 0 ? Date.now() + (ttl * 1000) : Infinity;
    const serializedValue = JSON.stringify({ value, expiry });
    
    await client.set(key, serializedValue);
    
    if (ttl > 0) {
      await client.expire(key, ttl);
    }
    
    console.log(`Redis cache set: ${key} (expires in ${ttl}s)`);
    return true;
  } catch (error) {
    console.error(`Redis error when setting ${key}:`, error);
    return false;
  }
}

/**
 * Get a value from Redis cache
 */
export async function getRedisCache<T>(key: string): Promise<T | null> {
  const client = await getRedisClient();
  if (!client) return null;
  
  try {
    const cachedData = await client.get(key);
    
    if (!cachedData) {
      console.log(`Redis cache miss: ${key}`);
      return null;
    }
    
    const parsed = JSON.parse(cachedData) as CacheValue<T>;
    
    // Check if cache has expired
    if (parsed.expiry < Date.now()) {
      console.log(`Redis cache expired: ${key}`);
      await client.del(key);
      return null;
    }
    
    console.log(`Redis cache hit: ${key}`);
    return parsed.value;
  } catch (error) {
    console.error(`Redis error when getting ${key}:`, error);
    return null;
  }
}

/**
 * Delete a value from Redis cache
 */
export async function deleteRedisCache(key: string): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return false;
  
  try {
    await client.del(key);
    console.log(`Redis cache deleted: ${key}`);
    return true;
  } catch (error) {
    console.error(`Redis error when deleting ${key}:`, error);
    return false;
  }
}

/**
 * Clear the entire Redis cache
 */
export async function clearRedisCache(): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return false;
  
  try {
    await client.flushdb();
    console.log('Redis cache cleared');
    return true;
  } catch (error) {
    console.error('Redis error when clearing cache:', error);
    return false;
  }
}

/**
 * Get Redis cache statistics
 */
export async function getRedisStats(): Promise<{
  type: 'redis';
  keys?: number;
  memory?: string;
} | null> {
  const client = await getRedisClient();
  if (!client) return null;
  
  try {
    const info = await client.info('memory');
    const dbSize = await client.dbsize();
    
    // Parse memory info
    const usedMemoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
    const usedMemory = usedMemoryMatch ? usedMemoryMatch[1].trim() : 'unknown';
    
    return {
      type: 'redis',
      keys: dbSize,
      memory: usedMemory
    };
  } catch (error) {
    console.error('Redis error when getting stats:', error);
    return null;
  }
} 