# Data Model & Backend Contracts

This document specifies the exact JSON schemas and TypeScript interfaces exported from `career-prisma` for consumption by the mobile app.

## 1. Floorplan Data Contract (`/api/events/[slug]/floorplan`)

```typescript
export interface ExportedFloorplanData {
  svg: string;               // Cleaned SVG string containing stand paths/rects
  backgroundImage: string | null; // Optional background map overlay file ID
  booths: ExportedBooth[];   // List of booth assignments
}
```

## 2. Booth Model (`ExportedBooth`)

```typescript
export interface ExportedBooth {
  id: number;                // Booth ID
  booth_number: number;      // Public booth number displayed on map (e.g. 42)
  coords: BoothCoords;       // Coordinate geometry (rect or path)
  floorplan_id: number;
  company_id: string | null; // UUID of assigned company
  company?: ExportedCompany | null;
}

export type BoothCoords = 
  | { type: 'rect'; x: number; y: number; width: number; height: number; transform?: string }
  | { type: 'path'; d: string; transform?: string }
  | { x: number; y: number; width: number; height: number };
```

## 3. Company Model (`ExportedCompany`)

```typescript
export interface ExportedCompany {
  id: string;                // Company UUID
  name: string;              // Company name (e.g. "ASML", "IMEC")
  logo_id: string | null;    // File ID for company logo
  logo_url?: string;         // Fully resolved HTTP URL to logo image
  short_description?: string | null;
  long_description?: string | null;
  location?: string | null;  // Headquarters/location
  website?: string | null;   // Company website URL
  page_image?: string | null;// Header image file ID
  category?: ExportedMaster[];// Target master degrees / fields of study
  representatives?: ExportedRepresentative[]; // Key contact persons
  vacancies?: ExportedVacancy[]; // Job opportunities at event
}
```

## 4. Contact Person / Representative Model (`ExportedRepresentative`)

```typescript
export interface ExportedRepresentative {
  id: string;                // User UUID
  first_name: string | null;
  last_name: string | null;
  title: string | null;      // Job title (e.g. "Senior Recruiter", "Lead Engineer")
  email: string | null;
  tel: string | null;        // Phone number
  avatar_url?: string | null;// Profile photo URL
}
```

## 5. Master Degree Model (`ExportedMaster`)

```typescript
export interface ExportedMaster {
  id: number;
  name: string;              // Full name e.g. "Master of Science in Computer Science"
  short_name: string;        // Abbreviation e.g. "CW", "ELT", "WTK"
  logo_id?: string | null;   // Icon file ID
  students?: number;
}
```

## 6. Vacancy Model (`ExportedVacancy`)

```typescript
export interface ExportedVacancy {
  id: string;
  title: string;
  type: string;              // e.g. "Full-time", "Internship", "Master Thesis"
  location?: string | null;
  url?: string | null;
}
```
