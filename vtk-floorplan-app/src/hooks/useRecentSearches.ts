import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@vtk_floorplan/recent_searches';
const MAX_RECENTS = 6;

export interface RecentSearch {
  boothId: number;
  boothNumber: number;
  companyName: string;
}

/**
 * Remembers the stands a visitor has looked up so the search panel is never
 * blank. At a career fair people revisit the same handful of companies all day.
 */
export function useRecentSearches() {
  const [recents, setRecents] = useState<RecentSearch[]>([]);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecents(parsed.slice(0, MAX_RECENTS));
      })
      .catch(() => {
        /* A missing or corrupt cache is not worth surfacing to the user. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: RecentSearch[]) => {
    setRecents(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const addRecent = useCallback(
    (entry: RecentSearch) => {
      setRecents((prev) => {
        const next = [entry, ...prev.filter((r) => r.boothId !== entry.boothId)].slice(
          0,
          MAX_RECENTS
        );
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    []
  );

  const clearRecents = useCallback(() => persist([]), [persist]);

  return { recents, addRecent, clearRecents };
}
