/**
 * TypeScript Data Models for VTK Career Mobile Floorplan App.
 * Derived directly from career-prisma database schema & API contracts.
 */

export interface ExportedFloorplanData {
  svg: string;
  backgroundImage: string | null;
  booths: ExportedBooth[];
}

export type BoothCoords = 
  | { type: 'rect'; x: number; y: number; width: number; height: number; transform?: string }
  | { type: 'path'; d: string; transform?: string }
  | { x: number; y: number; width: number; height: number };

export interface ExportedBooth {
  id: number;
  booth_number: number;
  coords: BoothCoords;
  floorplan_id: number;
  company_id: string | null;
  company?: ExportedCompany | null;
}

export interface ExportedCompany {
  id: string;
  name: string;
  logo_id: string | null;
  logo_url?: string | null;
  short_description?: string | null;
  long_description?: string | null;
  location?: string | null;
  website?: string | null;
  page_image?: string | null;
  category?: ExportedMaster[];
  representatives?: ExportedRepresentative[];
  vacancies?: ExportedVacancy[];
}

export interface ExportedRepresentative {
  id: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  email: string | null;
  tel: string | null;
  avatar_url?: string | null;
}

export interface ExportedMaster {
  id: number;
  name: string;
  short_name: string;
  logo_id?: string | null;
  students?: number;
}

export interface ExportedVacancy {
  id: string;
  title: string;
  type: string;
  location?: string | null;
  url?: string | null;
}

/**
 * Cache storage entry wrapper for offline storage.
 */
export interface CachedFloorplan {
  eventSlug: string;
  data: ExportedFloorplanData;
  timestamp: number;
}

/**
 * Result returned by the API / cache service layer.
 */
export interface FetchFloorplanResult {
  data: ExportedFloorplanData;
  isCached: boolean;
  isOffline: boolean;
  lastSynced: number;
}

