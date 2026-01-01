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
  page_image?: string;
  page_on_platform?: boolean;
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
  status?: string;
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
  events?: CareerEvent[];
  event?: CareerEvent; // Deprecated: use events instead (kept for backward compatibility)
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
  company_guide?: string; // Directus file ID for PDF
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
  background_image?: string;
}

export type Booth = {
  id: string;
  booth_number: number;
  coords: { x_pct: number; y_pct: number; width_pct: number; height_pct: number };
  Floorplan: Floorplan;
  company?: Company;
}

export type Master = {
  id: string;
  name: string;
  short_name: string;
  logo: string;
  students?: number;
  modules?: string; // HTML content
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
  max_entries?: number; // Maximum number of submissions allowed
  is_event_registration?: boolean; // If true, this form is for event registration (student forms)
  is_company_form?: boolean; // If true, this form is for companies
  event_id?: string; // ID of the linked career event (for event registration forms and company forms)
  option_ids?: string[]; // IDs of career event options - companies with these options are assigned to this form
  event_email_subject?: string; // Email subject for event confirmation
  event_email_content?: string; // Email content for event confirmation
  event_date?: string; // Event start date/time (ISO string)
  event_end_date?: string; // Event end date/time (ISO string)
  event_location?: string; // Event location
  company_form_email_subject?: string; // Email subject for company form confirmation
  company_form_email_content?: string; // Email content for company form confirmation
  send_company_form_email?: boolean; // Whether to send confirmation email for company forms
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
    wordLimit?: number; // Maximum number of words (for textarea fields)
  };
  layout?: 'full' | 'half' | 'third' | 'two-thirds'; // Field width layout
  multiple?: boolean; // For file fields - allow multiple file uploads
  image?: string; // Directus file ID for field image (useful for material-related forms)
  description?: string; // Description text to show with the field
}

export type FormResponse = {
  id: string;
  form_version_id: string | FormVersion;
  user_id?: string | DirectusUser;
  data: Record<string, unknown>;
  submitted_at: string;
  attachments?: string[]; // Directus file IDs
  attendant_uuid?: string; // Unique UUID for event registration attendants
  company_id?: string | Company; // Company that submitted the form (for company forms)
  submitter_first_name?: string; // First name of person who submitted (for company forms, especially non-logged-in)
  submitter_last_name?: string; // Last name of person who submitted (for company forms, especially non-logged-in)
  submitter_email?: string; // Email of person who submitted (for company forms, especially non-logged-in)
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
