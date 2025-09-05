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
  // salesperson can be a user relation (expand fields when requesting)
};

export type CareerEvent = {
  id: string;
  name: string;
  description: string;
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

// Optional: Full Directus Schema map (only collections you use)
export type Schema = {
  directus_users: DirectusUser;
  company: Company; // collection key should match your collection name
};
