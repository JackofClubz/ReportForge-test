import { useState, useEffect, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  orgId: string;
}

interface CacheConfig {
  ttl?: number; // Time to live in milliseconds
  key: string;
}

// Global cache outside React to persist across component unmounts
const globalCache = new Map<string, CacheEntry<any>>();

export function useDataCache<T>(
  config: CacheConfig,
  fetcher: () => Promise<T>,
  dependencies: any[] = [],
  currentOrgId: string | null
) {
  const { ttl = 5 * 60 * 1000, key } = config; // Default 5 minutes TTL
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  // Create org-specific cache key
  const cacheKey = currentOrgId ? `${key}_${currentOrgId}` : key;

  useEffect(() => {
    mountedRef.current = true;
    
    // Listen for cache invalidation events
    const handleCacheInvalidation = (event: CustomEvent) => {
      const { pattern, orgId } = event.detail;
      if (pattern === cacheKey || (orgId === currentOrgId && key.includes(pattern.split('_')[0]))) {
        console.log(`🔄 [CACHE] Invalidation event received for ${key}`);
        globalCache.delete(cacheKey);
        // Trigger refetch by updating dependencies
        setData(null);
        setLoading(true);
      }
    };

    window.addEventListener('invalidate-cache', handleCacheInvalidation as EventListener);
    
    return () => {
      mountedRef.current = false;
      window.removeEventListener('invalidate-cache', handleCacheInvalidation as EventListener);
    };
  }, [cacheKey, currentOrgId, key]);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentOrgId) {
        setData(null);
        setLoading(false);
        setError(null);
        return;
      }

      // Check cache first
      const cached = globalCache.get(cacheKey);
      const now = Date.now();
      
      if (cached && 
          cached.orgId === currentOrgId && 
          now - cached.timestamp < ttl) {
        console.log(`📦 [CACHE] Cache hit for ${key}`);
        setData(cached.data);
        setLoading(false);
        setError(null);
        return;
      }

      console.log(`🔄 [CACHE] Cache miss for ${key}, fetching...`);
      setLoading(true);
      setError(null);

      try {
        const result = await fetcher();
        
        if (!mountedRef.current) return;

        // Update cache
        globalCache.set(cacheKey, {
          data: result,
          timestamp: now,
          orgId: currentOrgId
        });

        setData(result);
        console.log(`✅ [CACHE] Cached ${key} for org ${currentOrgId}`);
      } catch (err) {
        if (!mountedRef.current) return;
        
        const error = err instanceof Error ? err : new Error('Fetch failed');
        console.error(`❌ [CACHE] Error fetching ${key}:`, error);
        setError(error);
        setData(null);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [cacheKey, currentOrgId, ttl, ...dependencies]);

  // Function to invalidate cache
  const invalidateCache = () => {
    globalCache.delete(cacheKey);
    console.log(`🗑️ [CACHE] Invalidated cache for ${key}`);
  };

  // Function to invalidate all caches for current org
  const invalidateOrgCache = () => {
    if (!currentOrgId) return;
    
    for (const [key, entry] of globalCache.entries()) {
      if (entry.orgId === currentOrgId) {
        globalCache.delete(key);
      }
    }
    console.log(`🗑️ [CACHE] Invalidated all cache for org ${currentOrgId}`);
  };

  return {
    data,
    loading,
    error,
    invalidateCache,
    invalidateOrgCache,
    isFromCache: data !== null && !loading && !error
  };
} 