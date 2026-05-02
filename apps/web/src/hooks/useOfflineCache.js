/* BolKe Offline Cache Hook
 * Manages IndexedDB cache for offline support
 * PRD FR-6.1, FR-6.2 — cache last 50 queries for 24h
 */

import { useState, useEffect, useCallback } from 'react';
import { cacheQuery, getRecentQueries, purgeExpired } from '../services/offlineDb';

export function useOfflineCache() {
  const [recentQueries, setRecentQueries] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Purge expired entries on mount
    purgeExpired();

    // Load recent queries
    loadRecent();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadRecent = useCallback(async () => {
    const queries = await getRecentQueries(2); // Show last 2 as icons — design.md §4.1
    setRecentQueries(queries);
  }, []);

  const saveQuery = useCallback(async (queryResult) => {
    await cacheQuery(queryResult);
    await loadRecent();
  }, [loadRecent]);

  return {
    recentQueries,
    isOnline,
    saveQuery,
    loadRecent,
  };
}
