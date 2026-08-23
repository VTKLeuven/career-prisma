import { apiGet, ApiError } from './client';
import { getFloorplanCache, saveFloorplanCache } from '../storage/cache';
import { MOCK_FLOORPLAN_DATA } from '../data/mockFloorplan';
import { ExportedFloorplanData, FetchFloorplanResult } from '../types/floorplan';

/**
 * Fetches floorplan SVG and booth mapping for a given event slug.
 * Operates offline-first:
 * 1. Tries to fetch live floorplan data from VTK backend.
 * 2. On success, updates local AsyncStorage cache.
 * 3. On network error / offline, serves stored local cache.
 * 4. On cold start with no cache, falls back to bundled mock dataset.
 */
export async function getEventFloorplan(
  eventSlug: string
): Promise<FetchFloorplanResult> {
  const normalizedSlug = eventSlug.toLowerCase();

  try {
    const liveData = await apiGet<ExportedFloorplanData>(
      `/api/events/${normalizedSlug}/floorplan`
    );

    if (liveData && liveData.svg && Array.isArray(liveData.booths)) {
      // Asynchronously persist to cache
      await saveFloorplanCache(normalizedSlug, liveData);

      return {
        data: liveData,
        isCached: false,
        isOffline: false,
        lastSynced: Date.now(),
      };
    }
    throw new Error('Invalid payload received from VTK floorplan endpoint');
  } catch (error) {
    const isNetError = error instanceof ApiError ? error.isNetworkError : true;
    console.warn(
      `[Floorplan API] Live fetch for '${eventSlug}' unavailable (${error}). Attempting cache fallback.`
    );

    const cachedEntry = await getFloorplanCache(normalizedSlug);
    if (cachedEntry) {
      return {
        data: cachedEntry.data,
        isCached: true,
        isOffline: isNetError,
        lastSynced: cachedEntry.timestamp,
      };
    }

    // Bundled fallback for offline development & initial load before sync
    return {
      data: MOCK_FLOORPLAN_DATA,
      isCached: true,
      isOffline: true,
      lastSynced: Date.now(),
    };
  }
}
