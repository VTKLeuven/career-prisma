import type { ComponentType } from "react";
import {
  BookUser,
  Briefcase,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  CupSoda,
  FileText,
  GraduationCap,
  Mail,
  MapPinned,
  Mic2,
  MonitorPlay,
  School,
  Tags,
  UserRoundCheck,
  Users,
  UsersRound,
  Workflow,
} from "lucide-react";

export type AdminNavIcon = ComponentType<{ className?: string }>;

/** A logical grouping for the admin hub screen. Order here defines display order. */
export type AdminNavGroup =
  | "Companies & People"
  | "Events"
  | "Education"
  | "Job Platform"
  | "Operations";

export const ADMIN_NAV_GROUP_ORDER: AdminNavGroup[] = [
  "Companies & People",
  "Events",
  "Education",
  "Job Platform",
  "Operations",
];

export const ADMIN_NAV_GROUP_ICONS: Record<AdminNavGroup, AdminNavIcon> = {
  "Companies & People": Building2,
  Events: CalendarDays,
  Education: School,
  "Job Platform": Briefcase,
  Operations: Workflow,
};

export type AdminNavItem = {
  title: string;
  url: string;
  icon: AdminNavIcon;
  group: AdminNavGroup;
  description: string;
};

/**
 * Single source of truth for the admin management sections.
 * Consumed by both the admin sidebar (when browsing /admin/*) and the
 * admin hub screen at /admin. Keep this list in sync in one place.
 */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  // --- Companies & People ---
  {
    title: "Companies",
    url: "/admin/companies",
    icon: Building2,
    group: "Companies & People",
    description: "Manage companies, representatives and purchased options.",
  },
  {
    title: "Pending Approvals",
    url: "/admin/approvals",
    icon: UserRoundCheck,
    group: "Companies & People",
    description: "Review and approve pending representative requests.",
  },
  {
    title: "Students",
    url: "/admin/students",
    icon: GraduationCap,
    group: "Companies & People",
    description: "View and manage registered students.",
  },
  {
    title: "User Management",
    url: "/admin/users",
    icon: Users,
    group: "Companies & People",
    description: "Manage platform users and their roles.",
  },

  // --- Events ---
  {
    title: "Academic Years",
    url: "/admin/academic-years",
    icon: CalendarDays,
    group: "Events",
    description: "Define the date ranges used for annual event editions and sales history.",
  },
  {
    title: "Career Options & Sales",
    url: "/admin/career-options",
    icon: BriefcaseBusiness,
    group: "Events",
    description: "Manage annual packages, prices and company sales history.",
  },
  {
    title: "Check-ins",
    url: "/admin/checkins",
    icon: ClipboardCheck,
    group: "Events",
    description: "Track attendee check-ins for each event edition.",
  },
  {
    title: "Event Pages & Timetables",
    url: "/admin/event-pages",
    icon: CalendarClock,
    group: "Events",
    description: "Edit the public page and timetable of each annual event edition.",
  },
  {
    title: "Events",
    url: "/admin/events",
    icon: CalendarDays,
    group: "Events",
    description: "Create annual editions from recurring event series and manage their dates.",
  },
  {
    title: "Matching Software",
    url: "/admin/matching-software",
    icon: UsersRound,
    group: "Events",
    description: "Configure student-company matching for an event edition.",
  },
  {
    title: "Schedules",
    url: "/admin/schedules",
    icon: CalendarClock,
    group: "Events",
    description: "Manage company schedules for event editions.",
  },
  {
    title: "Speakers",
    url: "/admin/speakers",
    icon: Mic2,
    group: "Events",
    description: "Manage speakers shown on event pages.",
  },
  {
    title: "Zones & Booths",
    url: "/admin/zones",
    icon: MapPinned,
    group: "Events",
    description: "Configure zones, booths and floor plans for event editions.",
  },

  // --- Education ---
  {
    title: "Faculties",
    url: "/admin/faculties",
    icon: School,
    group: "Education",
    description: "Manage faculties and their study programs.",
  },
  {
    title: "Master Categories",
    url: "/admin/masters",
    icon: Tags,
    group: "Education",
    description: "Manage master categories used across the platform.",
  },

  // --- Job Platform ---
  {
    title: "CV Book",
    url: "/admin/cv-book",
    icon: BookUser,
    group: "Job Platform",
    description: "Screen and manage student CVs and access requests.",
  },
  {
    title: "Vacancies",
    url: "/admin/vacancies",
    icon: Briefcase,
    group: "Job Platform",
    description: "Manage vacancies posted on the job platform.",
  },

  // --- Operations ---
  {
    title: "Digital Signage",
    url: "/admin/signage",
    icon: MonitorPlay,
    group: "Operations",
    description: "Manage screens and media for digital signage.",
  },
  {
    title: "Drinks & Snacks",
    url: "/admin/drinks",
    icon: CupSoda,
    group: "Operations",
    description: "Manage the drinks & snacks ordering catalog.",
  },
  {
    title: "Email Queue",
    url: "/admin/email-queue",
    icon: Mail,
    group: "Operations",
    description: "Monitor and manage queued outgoing emails.",
  },
  {
    title: "Forms",
    url: "/admin/forms",
    icon: FileText,
    group: "Operations",
    description: "Build and manage forms and their responses.",
  },
  {
    title: "Shifters",
    url: "/admin/shifters",
    icon: UsersRound,
    group: "Operations",
    description: "Manage shifters and their assignments.",
  },
];
