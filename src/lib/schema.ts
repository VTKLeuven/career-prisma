// lib/schema.ts
export type DirectusRole = { id: string; name: string };

export type DirectusUser = {
  id: string;
  name: string | null;
  email: string;
  tel?: string | null;
  role?: string | DirectusRole | null;
  admin: boolean
} | null;

export type Company = {
  id: string;
  name: string;
  salesperson?: { id: string; first_name: string | null; last_name: string | null } | string | null;
  logo?: string;
  short_description?: string;
  VAT?: string | null;
  address_street?: string | null;
  address_number?: string | null;
  address_zip?: string | null;
  address_city?: string | null;
  address_country?: string | null;
  address: string;
  representatives?: Array<
    | { id: string; first_name: string | null; last_name: string | null } 
    | string
  >
  category?: { id: string; name: string; short_name: string; logo: string }
};

export type CareerEvent = {
  id: string;
  name: string;
  description: string;
  image: string;
  location: string;
  date: string;
  start_hour: string;
  end_hour: string;
  max_companies: number;
  num_of_students: number;
  options: CareerEvent[]
}

export type CareerEventOption = {
  id: string;
  name: string;
  description: string;
  price: string;
}

export type CareerEventPage = {
  id: string;
  event: CareerEvent;
  description_EN: string;
  registration_link?: string;
  shout: string;
  href?: string;
  tagline?: string;
  timetable?: TimeSlot[];
  address?: string;
  parking?: string;
  location?: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  companies?: Company[];
  floorplan?: Floorplan;
};

export type TimeSlot = {
  id: string;
  title: string;
  events?: CareerEventPage[];
  description?: string;
  start_time: string;
  end_time: string;
  icon?: string
}

export type Floorplan = {
  id: string;
  name: string;
  svg_file: string;
  year: string;
}

export type Booth = {
  id: string;
  booth_number: string;
  coords: { x_pct: number; y_pct: number; width_pct: number; height_pct: number };
  Floorplan: Floorplan;
  company?: Company;
}

// Optional: Full Directus Schema map (only collections you use)
export type Schema = {
  directus_users: DirectusUser;
  company: Company; // collection key should match your collection name
  booths: Booth
};
