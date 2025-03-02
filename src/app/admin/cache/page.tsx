'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, Trash2 } from 'lucide-react';

interface CacheStats {
  type: 'redis' | 'memory';
  size?: number;
  keys?: number;
  memory?: string;
  timestamp?: string;
  redisAvailable?: boolean;
}

export default function CacheAdminPage() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clearSuccess, setClearSuccess] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/cache/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats({
          ...data.data,
          timestamp: data.timestamp
        });
      } else {
        setError(data.error || 'Failed to fetch cache statistics');
      }
    } catch (err) {
      setError('An error occurred while fetching cache statistics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async () => {
    try {
      setLoading(true);
      setError(null);
      setClearSuccess(null);
      
      const response = await fetch('/api/cache/clear', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setClearSuccess('Cache cleared successfully');
        // Refresh stats after clearing
        fetchStats();
      } else {
        setError(data.error || 'Failed to clear cache');
      }
    } catch (err) {
      setError('An error occurred while clearing cache');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Cache Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Cache Statistics</CardTitle>
            <CardDescription>
              Current cache usage and statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !stats && (
              <div className="flex items-center justify-center p-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
              </div>
            )}
            
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {clearSuccess && (
              <Alert className="mb-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{clearSuccess}</AlertDescription>
              </Alert>
            )}
            
            {stats && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Cache Type</div>
                    <div className="text-xl font-semibold mt-1 capitalize">
                      {stats.type}
                    </div>
                  </div>
                  
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Redis Status</div>
                    <div className="flex items-center mt-1">
                      <div className={`h-3 w-3 rounded-full mr-2 ${stats.redisAvailable ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-xl font-semibold">{stats.redisAvailable ? 'Connected' : 'Disconnected'}</span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Cached Items</div>
                    <div className="text-xl font-semibold mt-1">
                      {stats.keys !== undefined ? stats.keys.toLocaleString() : 'N/A'}
                    </div>
                  </div>
                  
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Memory Usage</div>
                    <div className="text-xl font-semibold mt-1">
                      {stats.memory || (stats.size ? `${(stats.size / (1024 * 1024)).toFixed(2)} MB` : 'N/A')}
                    </div>
                  </div>
                  
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg col-span-2">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Last Updated</div>
                    <div className="text-sm font-medium mt-1">
                      {stats.timestamp ? new Date(stats.timestamp).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={fetchStats}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            
            <Button 
              variant="destructive" 
              onClick={clearCache}
              disabled={loading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Cache
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Cache Information</CardTitle>
            <CardDescription>
              About the caching system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview">
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="config">Configuration</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview">
                <div className="space-y-4">
                  <p>
                    The application uses a hybrid caching system that prioritizes Redis for production environments
                    and falls back to in-memory caching when Redis is unavailable.
                  </p>
                  <p>
                    Cache entries are automatically expired based on their TTL (Time To Live) values,
                    which vary by data type.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="config">
                <div className="space-y-4">
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Default TTL</div>
                    <div className="text-xl font-semibold mt-1">
                      24 hours
                    </div>
                  </div>
                  
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Memory Limit</div>
                    <div className="text-xl font-semibold mt-1">
                      30 MB
                    </div>
                  </div>
                  
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Cache TTLs</div>
                    <div className="text-sm mt-1 space-y-1">
                      <div>Stock Details: 7 days</div>
                      <div>Daily Prices: 1 day</div>
                      <div>Weekly Prices: 2 days</div>
                      <div>Monthly Prices: 7 days</div>
                      <div>Yearly Prices: 30 days</div>
                      <div>Search Results: 1 hour</div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 