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
  avatar?: string;
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

export type Form = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  form_versions?: FormVersion[];  // Changed from 'versions' to 'form_versions'
};

export type FormMetadata = {
  deadline?: string; // ISO date string
  is_event_registration?: boolean; // If true, this form is for event registration
  event_email_subject?: string; // Email subject for event confirmation
  event_email_content?: string; // Email content for event confirmation
  event_date?: string; // Event date/time (ISO string)
  event_location?: string; // Event location
  [key: string]: unknown; // Allow other metadata fields
};

export type FormVersion = {
  id: string;
  form_id: string | Form;
  version_number: number;
  schema: FormSchema;
  is_active: boolean;
  created_at: string;
  metadata?: FormMetadata;
}

export type FormSchema = {
  fields: FormField[];
}

export type FormField = {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'email' | 'number' | 'select' | 'checkbox' | 'radio' | 'file' | 'date' | 'date-range' | 'time';
  required?: boolean;
  placeholder?: string;
  options?: string[]; // for select, radio, checkbox
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    maxFileSize?: number; // Max file size in bytes (for file fields)
    allowedFileTypes?: string[]; // Allowed MIME types (for file fields)
  };
  layout?: 'full' | 'half' | 'third' | 'two-thirds'; // Field width layout
  multiple?: boolean; // For file fields - allow multiple file uploads
}

export type FormResponse = {
  id: string;
  form_version_id: string | FormVersion;
  user_id?: string | DirectusUser;
  data: Record<string, unknown>;
  submitted_at: string;
  attachments?: string[]; // Directus file IDs
}

// Optional: Full Directus Schema map (only collections you use)
export type Schema = {
  directus_users: CompanyRep;
  company: Company; // collection key should match your collection name
  booths: Booth;
  forms: Form;
  form_versions: FormVersion;
  form_responses: FormResponse;
};
