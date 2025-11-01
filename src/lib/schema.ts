// lib/schema.ts
export type DirectusRole = { id: string; name: string };

export type DirectusUser = {
  id: string;
  name: string | null;
  title?: string;
  email: string;
  tel?: string | null;
  role?: string | DirectusRole | null;
  admin: boolean;
  company: Company;
  status?: string;
} | null;

export type CompanyRep = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  title?: string;
  email: string;
  tel?: string | null;
  role?: string | DirectusRole | null;
  admin: boolean;
  company: Company;
  status: string;
} | null;

export type Company = {
  id: string;
  name: string;
  salesperson?: { id: string; first_name: string | null; last_name: string | null } | string | null;
  logo?: string;
  website?: string;
  short_description?: string;
  long_description?: string;
  location?: string;
  VAT?: string | null;
  address_street?: string | null;
  address_number?: string | null;
  address_zip?: string | null;
  address_city?: string | null;
  address_country?: string | null;
  address: string;
  representatives?: CompanyRep[]
  category?: Master[] | { master_id: string; }[]
  options?: CareerEventOption[]
};

export type CareerEvent = {
  id: string;
  name: string;
  description: string;
  image: string;
  shout: string;
  location: string;
  date: string;
  start_hour: string;
  end_hour: string;
  max_companies: number;
  num_of_students: number;
  options: CareerEventOption[];
  href?: string;
}

export type CareerEventOption = {
  id: string;
  name: string;
  description: string;
  price: string;
  event: CareerEvent;
}

export type CareerEventPage = {
  id: string;
  event: CareerEvent;
  description_EN: string;
  image: string;
  registration_link?: string;
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

export type Master = {
  id: string;
  name: string;
  short_name: string;
  logo: string
}

// Optional: Full Directus Schema map (only collections you use)
export type Schema = {
  directus_users: CompanyRep;
  company: Company; // collection key should match your collection name
  booths: Booth
};
