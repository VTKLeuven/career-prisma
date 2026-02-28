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
  company?: Company | null;
  status?: string;
  is_shifter?: boolean;
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

export type Student = {
  id: string;
  username: string; // LITUS username (unique identifier)
  first_name: string | null;
  last_name: string | null;
  full_name?: string; // Full name from LITUS
  email: string;
  university_status?: string; // "student"
  university?: string; // University name (e.g., "KU Leuven", "Universiteit Gent")
  organization_status?: string; // e.g., "praesidium" (kept for backward compatibility)
  in_workinggroup?: boolean;
  litus_access_token?: string; // Encrypted/stored access token for API calls
  litus_token_expires_at?: string; // ISO date when token expires
  password?: string; // Hashed password for non-OAuth students
  verified?: boolean; // Whether email has been verified
  verification_token_hash?: string; // Hash of verification token
  verification_token_created?: string; // When verification token was created
  date_created?: string;
  date_updated?: string;
  is_shifter?: boolean;
};

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

export type CareerSubOption = {
  id: string;
  name: string;
  description: string;
  price: string;
  active: boolean;
}

export type CareerEventOption = {
  id: string;
  name: string;
  description: string;
  price: string;
  events?: CareerEvent[];
  event?: CareerEvent; // Deprecated: use events instead (kept for backward compatibility)
  sub_options?: CareerSubOption[];
}

/** Header button types that can be shown on the event page header */
export type HeaderButtonType = 'floorplan' | 'company_guide' | 'cv_upload' | 'matching_software';

/** RIASEC types for student matching (Holland codes) */
export type RIASECType = 'R' | 'I' | 'A' | 'S' | 'E' | 'C';

/** Matching software config - per year and event, with optional prerequisite form */
export type MatchingSoftware = {
  id: string;
  year: string | AcademicYear;
  event: string | CareerEvent;
  prerequisite_form?: string | Form;
  active: boolean;
};

/** Student's RIASEC matching response - one per student per matching software */
export type StudentMatchingResponse = {
  id: string;
  student: string | Student;
  matching_software: string | MatchingSoftware;
  riasec_answers: Record<string, string>; // { "1": "A", "2": "B", ... }
  riasec: Record<RIASECType, number>; // percentages
  prerequisite_form_response?: Record<string, unknown>; // included form response data
  general_info_answers?: { work_preference: string[]; company_preference?: string[]; options_preference?: string[] }; // General info multiselect
  companies?: string[] | Array<{ id: string; name?: string }>; // M2M – matched company IDs or expanded objects
};

/** OCIA culture types for company matching (Clan, Adhocracy, Market, Hierarchy) */
export type OCIAType = "Clan" | "Adhocracy" | "Market" | "Hierarchy";

/** Company's OCIA matching response - one per company per matching software */
export type CompanyMatchingResponse = {
  id: string;
  company: string | Company;
  matching_software: string | MatchingSoftware;
  ocia_answers: Record<string, string>; // { "1": "A", "2": "B", ... }
  ocia: Record<OCIAType, number>; // percentages
  general_info_answers?: { work_preference: string[]; company_type?: string[]; work_options?: string[] }; // General info multiselect
};

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
  /** Which buttons to show in the event header. When empty/undefined, falls back to legacy behavior (header based on floorplan). Add a JSON field "header_buttons" to career_event_page in Directus (array of strings: "floorplan", "company_guide"). */
  header_buttons?: HeaderButtonType[];
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
  zone?: Zone | string;
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
  requires_login?: boolean; // If true, only logged-in students can submit this form
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
  type: 'text' | 'textarea' | 'email' | 'number' | 'select' | 'checkbox' | 'radio' | 'file' | 'date' | 'date-range' | 'time' | 'linkedin';
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
  student_id?: string | Student; // Student who submitted the form (for student forms)
  data: Record<string, unknown>;
  submitted_at: string;
  attachments?: string[]; // Directus file IDs
  attendant_uuid?: string; // Unique UUID for event registration attendants
  company_id?: string | Company; // Company that submitted the form (for company forms)
  submitter_first_name?: string; // First name of person who submitted (for company forms, especially non-logged-in)
  submitter_last_name?: string; // Last name of person who submitted (for company forms, especially non-logged-in)
  submitter_email?: string; // Email of person who submitted (for company forms, especially non-logged-in)
}

export type AcademicYear = {
  id: string;
  name: string;
  start_of_year: string;
  end_of_year: string;
}

export type CVBook = {
  id: string;
  year: string | AcademicYear;
  form: string | Form;
  student_first_name_field: string;
  student_last_name_field: string;
  student_email_field: string;
  student_study_field: string;
  student_cv_field: string;
  student_linkedin_field?: string;
  student_first_name_field_backup?: string;
  student_last_name_field_backup?: string;
  student_email_field_backup?: string;
  student_study_field_backup?: string;
  student_cv_field_backup?: string;
  student_linkedin_field_backup?: string;
  active: boolean;
}

/** Company favourite for a student CV in a CV Book. */
export type CVBookFavourite = {
  id: string;
  company: string | { id: string };
  form_response: string | FormResponse;
  cv_book: string | CVBook;
  date_created?: string;
}

export type Drink = {
  id: string;
  name: string;
  type: 'drink' | 'snack';
  visible_from?: string; // Time string "HH:mm" or ISO
  visible_until?: string;
  is_active: boolean;
  image?: string; // Directus file ID
  icon?: string; // Iconify string
}

export type Zone = {
  id: string;
  name: string;
  booths: string[] | Booth[]; // M2M
}

export type Order = {
  id: string;
  booth: string | Booth;
  company: string | Company; // Denormalized for easier querying? Or computed. Directus usually links relations.
  items: OrderItem[]; // JSON field
  status: 'pending' | 'preparing' | 'finished';
  shifter?: string | DirectusUser;
  date_created: string;
  date_updated: string;
  zone?: string | Zone; // Snapshot of zone at time of order? or relational.
}

export type OrderItem = {
  drink_id: string;
  name: string;
  quantity: number;
}


export type AttendantScan = {
  id: string;
  attendant_uuid: string;
  form_response_id: string;
  company_id?: string | Company;
  scanned_by: string | DirectusUser;
  scanned_at: string;
};

export type CompanyUserRequest = {
  id: string;
  email: string;
  role?: string | DirectusRole; // ID or Role object
  status: string;
  date_created: string;
  company?: string | Company;
  salesperson?: string | DirectusUser;
  first_name?: string | null;
  last_name?: string | null;
  tel?: string | null;
  title?: string | null;
  invite_token_hash?: string;
  invite_token_created?: string;
}

// Optional: Full Directus Schema map (only collections you use)
export type Schema = {
  directus_users: DirectusUser[];
  company: Company[];
  booths: Booth[];
  forms: Form[];
  form_versions: FormVersion[];
  form_responses: FormResponse[];
  students: Student[];
  drinks: Drink[];
  orders: Order[];
  zones: Zone[];
  floorplans: Floorplan[];
  career_event_option: CareerEventOption[];
  career_event_page: CareerEventPage[];
  attendant_scans: AttendantScan[];
  zones_Booths: { id: number | string; zones_id: string | Zone; Booths_id: string | Booth }[];
  academic_year: AcademicYear[];
  cv_book: CVBook[];
  career_event: CareerEvent[];
  career_sub_option: CareerSubOption[];
  master: Master[];
  Booths: Booth[];
  Floorplan: Floorplan[];
  company_user_requests: CompanyUserRequest[];
  ordering_settings: { id?: string; company_ordering_enabled?: boolean }[];
};
