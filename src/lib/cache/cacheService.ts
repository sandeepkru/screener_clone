import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';
import AWS from 'aws-sdk';
import schedule from 'node-schedule';

// Environment variables with defaults for local development
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '86400', 10); // 24 hours in seconds
const S3_BUCKET = process.env.S3_BUCKET || '';
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const SNAPSHOT_INTERVAL = process.env.SNAPSHOT_INTERVAL || '0 0 * * *'; // Daily at midnight
const LOCAL_SNAPSHOT_DIR = process.env.LOCAL_SNAPSHOT_DIR || '/tmp/stockscreener-cache';

// Initialize Redis client
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Initialize AWS S3 client if S3 bucket is configured
let s3: AWS.S3 | null = null;
if (S3_BUCKET) {
  s3 = new AWS.S3({
    region: S3_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });
}

// Ensure local snapshot directory exists
if (!fs.existsSync(LOCAL_SNAPSHOT_DIR)) {
  fs.mkdirSync(LOCAL_SNAPSHOT_DIR, { recursive: true });
}

class CacheService {
  private isInitialized = false;

  constructor() {
    this.setupSnapshotSchedule();
  }

  /**
   * Initialize the cache service by loading snapshots
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('Initializing cache service...');
    
    try {
      // Try to load from S3 first if configured
      if (s3 && S3_BUCKET) {
        await this.loadSnapshotFromS3();
      } else {
        // Otherwise load from local snapshot
        await this.loadSnapshotFromLocal();
      }
      
      this.isInitialized = true;
      console.log('Cache service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize cache service:', error);
      // Continue even if initialization fails
      this.isInitialized = true;
    }
  }

  /**
   * Set a value in the cache with optional TTL
   */
  async set(key: string, value: any, ttl = CACHE_TTL): Promise<void> {
    await this.initialize();
    
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl > 0) {
        await redis.set(key, serializedValue, 'EX', ttl);
      } else {
        await redis.set(key, serializedValue);
      }
    } catch (error) {
      console.error(`Error setting cache for key ${key}:`, error);
      // Continue execution even if caching fails
    }
  }

  /**
   * Get a value from the cache
   */
  async get<T>(key: string): Promise<T | null> {
    await this.initialize();
    
    try {
      const value = await redis.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Error getting cache for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete a value from the cache
   */
  async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error(`Error deleting cache for key ${key}:`, error);
    }
  }

  /**
   * Clear the entire cache
   */
  async clear(): Promise<void> {
    try {
      await redis.flushall();
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Create a snapshot of the current cache state
   */
  async createSnapshot(): Promise<Record<string, any>> {
    console.log('Creating cache snapshot...');
    
    try {
      // Get all keys
      const keys = await redis.keys('*');
      const snapshot: Record<string, any> = {};
      
      // Get values for all keys
      for (const key of keys) {
        const value = await redis.get(key);
        if (value) {
          try {
            snapshot[key] = JSON.parse(value);
          } catch {
            snapshot[key] = value;
          }
        }
      }
      
      return snapshot;
    } catch (error) {
      console.error('Error creating cache snapshot:', error);
      return {};
    }
  }

  /**
   * Save snapshot to local filesystem
   */
  async saveSnapshotToLocal(): Promise<void> {
    try {
      const snapshot = await this.createSnapshot();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath = path.join(LOCAL_SNAPSHOT_DIR, `cache-snapshot-${timestamp}.json`);
      
      fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
      
      // Create a symlink to the latest snapshot
      const latestPath = path.join(LOCAL_SNAPSHOT_DIR, 'latest-snapshot.json');
      if (fs.existsSync(latestPath)) {
        fs.unlinkSync(latestPath);
      }
      fs.symlinkSync(filePath, latestPath);
      
      console.log(`Cache snapshot saved to ${filePath}`);
    } catch (error) {
      console.error('Error saving cache snapshot to local filesystem:', error);
    }
  }

  /**
   * Save snapshot to S3
   */
  async saveSnapshotToS3(): Promise<void> {
    if (!s3 || !S3_BUCKET) {
      console.log('S3 not configured, skipping S3 snapshot');
      return;
    }
    
    try {
      const snapshot = await this.createSnapshot();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const key = `cache-snapshots/cache-snapshot-${timestamp}.json`;
      
      await s3.putObject({
        Bucket: S3_BUCKET,
        Key: key,
        Body: JSON.stringify(snapshot),
        ContentType: 'application/json',
      }).promise();
      
      // Update the latest snapshot pointer
      await s3.putObject({
        Bucket: S3_BUCKET,
        Key: 'cache-snapshots/latest-snapshot.json',
        Body: JSON.stringify(snapshot),
        ContentType: 'application/json',
      }).promise();
      
      console.log(`Cache snapshot saved to S3: ${S3_BUCKET}/${key}`);
    } catch (error) {
      console.error('Error saving cache snapshot to S3:', error);
    }
  }

  /**
   * Load snapshot from local filesystem
   */
  async loadSnapshotFromLocal(): Promise<void> {
    try {
      const latestPath = path.join(LOCAL_SNAPSHOT_DIR, 'latest-snapshot.json');
      
      if (!fs.existsSync(latestPath)) {
        console.log('No local cache snapshot found');
        return;
      }
      
      const data = fs.readFileSync(latestPath, 'utf8');
      const snapshot = JSON.parse(data);
      
      // Restore data to Redis
      for (const [key, value] of Object.entries(snapshot)) {
        await this.set(key, value);
      }
      
      console.log(`Loaded cache snapshot from ${latestPath}`);
    } catch (error) {
      console.error('Error loading cache snapshot from local filesystem:', error);
    }
  }

  /**
   * Load snapshot from S3
   */
  async loadSnapshotFromS3(): Promise<void> {
    if (!s3 || !S3_BUCKET) {
      console.log('S3 not configured, skipping S3 snapshot load');
      return;
    }
    
    try {
      const response = await s3.getObject({
        Bucket: S3_BUCKET,
        Key: 'cache-snapshots/latest-snapshot.json',
      }).promise();
      
      if (!response.Body) {
        console.log('No S3 cache snapshot found');
        return;
      }
      
      const snapshot = JSON.parse(response.Body.toString());
      
      // Restore data to Redis
      for (const [key, value] of Object.entries(snapshot)) {
        await this.set(key, value);
      }
      
      console.log(`Loaded cache snapshot from S3: ${S3_BUCKET}/cache-snapshots/latest-snapshot.json`);
    } catch (error) {
      if ((error as AWS.AWSError).code === 'NoSuchKey') {
        console.log('No S3 cache snapshot found');
      } else {
        console.error('Error loading cache snapshot from S3:', error);
      }
    }
  }

  /**
   * Setup scheduled snapshots
   */
  private setupSnapshotSchedule(): void {
    // Schedule regular snapshots
    schedule.scheduleJob(SNAPSHOT_INTERVAL, async () => {
      console.log('Running scheduled cache snapshot...');
      
      // Save to local filesystem
      await this.saveSnapshotToLocal();
      
      // Save to S3 if configured
      if (s3 && S3_BUCKET) {
        await this.saveSnapshotToS3();
      }
    });
    
    console.log(`Scheduled cache snapshots with interval: ${SNAPSHOT_INTERVAL}`);
  }
}

// Export singleton instance
const cacheService = new CacheService();
export default cacheService; 