import { useState, useEffect, useCallback } from 'react';
import { getEventFloorplan } from '../api/floorplan';
import { ExportedFloorplanData } from '../types/floorplan';

export interface UseFloorplanDataReturn {
  data: ExportedFloorplanData | null;
  loading: boolean;
  isOffline: boolean;
  isCached: boolean;
  lastSynced: number | null;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom React Hook to load and manage interactive floorplan data with offline fallback.
 *
 * @param eventSlug Event slug identifier (defaults to 'jobfair-2026')
 */
export function useFloorplanData(
  eventSlug: string = 'jobfair-2026'
): UseFloorplanDataReturn {
  const [data, setData] = useState<ExportedFloorplanData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isCached, setIsCached] = useState<boolean>(false);
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getEventFloorplan(eventSlug);
      setData(result.data);
      setIsOffline(result.isOffline);
      setIsCached(result.isCached);
      setLastSynced(result.lastSynced);
    } catch (err: any) {
      console.error(`[useFloorplanData] Failed to load floorplan data:`, err);
      setError(err.message || 'Failed to load floorplan data');
    } finally {
      setLoading(false);
    }
  }, [eventSlug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    loading,
    isOffline,
    isCached,
    lastSynced,
    error,
    refetch: loadData,
  };
}
