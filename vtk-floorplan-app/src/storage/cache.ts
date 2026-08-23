import * as SQLite from 'expo-sqlite';
import { ExportedFloorplanData, CachedFloorplan } from '../types/floorplan';

let db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('vtk_floorplan.db');
    db.execSync(`
      CREATE TABLE IF NOT EXISTS floorplan_cache (
        slug TEXT PRIMARY KEY NOT NULL,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );
    `);
  }
  return db;
}

/**
 * Saves floorplan payload and timestamp to SQLite for offline access.
 */
export async function saveFloorplanCache(
  eventSlug: string,
  data: ExportedFloorplanData
): Promise<void> {
  try {
    const database = getDb();
    const jsonValue = JSON.stringify(data);
    const timestamp = Date.now();
    
    database.runSync(
      'INSERT OR REPLACE INTO floorplan_cache (slug, data, timestamp) VALUES (?, ?, ?)',
      eventSlug.toLowerCase(),
      jsonValue,
      timestamp
    );
  } catch (error) {
    console.error(`[SQLite Cache] Error saving floorplan for ${eventSlug}:`, error);
  }
}

/**
 * Retrieves cached floorplan payload from SQLite if available.
 */
export async function getFloorplanCache(
  eventSlug: string
): Promise<CachedFloorplan | null> {
  try {
    const database = getDb();
    const result = database.getFirstSync<{ slug: string; data: string; timestamp: number }>(
      'SELECT * FROM floorplan_cache WHERE slug = ?',
      eventSlug.toLowerCase()
    );

    if (!result) return null;

    const parsedData: ExportedFloorplanData = JSON.parse(result.data);
    return {
      eventSlug: result.slug,
      data: parsedData,
      timestamp: result.timestamp,
    };
  } catch (error) {
    console.error(`[SQLite Cache] Error reading floorplan for ${eventSlug}:`, error);
    return null;
  }
}

/**
 * Clears cached floorplan for a specific event slug or all event floorplans.
 */
export async function clearFloorplanCache(eventSlug?: string): Promise<void> {
  try {
    const database = getDb();
    if (eventSlug) {
      database.runSync('DELETE FROM floorplan_cache WHERE slug = ?', eventSlug.toLowerCase());
    } else {
      database.execSync('DELETE FROM floorplan_cache');
    }
  } catch (error) {
    console.error('[SQLite Cache] Error clearing floorplan cache:', error);
  }
}

/**
 * Lists all cached event slugs stored in local storage.
 */
export async function getAllCachedEventSlugs(): Promise<string[]> {
  try {
    const database = getDb();
    const result = database.getAllSync<{ slug: string }>('SELECT slug FROM floorplan_cache');
    return result.map(row => row.slug);
  } catch (error) {
    console.error('[SQLite Cache] Error getting cached event slugs:', error);
    return [];
  }
}
