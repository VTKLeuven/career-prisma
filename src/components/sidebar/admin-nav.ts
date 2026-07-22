import type { ComponentType } from "react";
import {
  BookUser,
  Briefcase,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
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
} from "lucide-react";

export type AdminNavIcon = ComponentType<{ className?: string }>;

/** A logical grouping for the admin hub screen. Order here defines display order. */
export type AdminNavGroup =
  | "Companies & Users"
  | "Job Platform"
  | "Event Content"
  | "Event Day Operations";

export const ADMIN_NAV_GROUP_ORDER: AdminNavGroup[] = [
  "Companies & Users",
  "Job Platform",
  "Event Content",
  "Event Day Operations",
];

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
  // --- Companies & Users ---
  {
    title: "Companies & Events",
    url: "/admin/companies-events",
    icon: Building2,
    group: "Companies & Users",
    description: "Manage companies, their reps and purchased options, and events.",
  },
  {
    title: "User Management",
    url: "/admin/users",
    icon: Users,
    group: "Companies & Users",
    description: "Manage platform users and their roles.",
  },
  {
    title: "Students",
    url: "/admin/students",
    icon: GraduationCap,
    group: "Companies & Users",
    description: "View and manage registered students.",
  },
  {
    title: "Pending Approvals",
    url: "/admin/approvals",
    icon: UserRoundCheck,
    group: "Companies & Users",
    description: "Review and approve pending representative requests.",
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

  // --- Event Content ---
  {
    title: "Event Pages & Timetables",
    url: "/admin/event-pages",
    icon: CalendarClock,
    group: "Event Content",
    description: "Edit event landing pages and their timetables.",
  },
  {
    title: "Forms Management",
    url: "/admin/forms",
    icon: FileText,
    group: "Event Content",
    description: "Build and manage company forms and responses.",
  },
  {
    title: "Speakers",
    url: "/admin/speakers",
    icon: Mic2,
    group: "Event Content",
    description: "Manage speakers shown on event pages.",
  },
  {
    title: "Career Options",
    url: "/admin/career-options",
    icon: BriefcaseBusiness,
    group: "Event Content",
    description: "Manage career options and sub-options.",
  },
  {
    title: "Master Categories",
    url: "/admin/masters",
    icon: Tags,
    group: "Event Content",
    description: "Manage master categories used across the platform.",
  },
  {
    title: "Faculties",
    url: "/admin/faculties",
    icon: School,
    group: "Event Content",
    description: "Manage faculties and their study programs.",
  },

  // --- Event Day Operations ---
  {
    title: "Check-ins",
    url: "/admin/checkins",
    icon: ClipboardCheck,
    group: "Event Day Operations",
    description: "Track and manage attendee check-ins per event.",
  },
  {
    title: "Zones & Booths",
    url: "/admin/zones",
    icon: MapPinned,
    group: "Event Day Operations",
    description: "Configure zones, booths and floor plans.",
  },
  {
    title: "Shifters",
    url: "/admin/shifters",
    icon: UsersRound,
    group: "Event Day Operations",
    description: "Manage shifters and their assignments.",
  },
  {
    title: "Drinks & Snacks",
    url: "/admin/drinks",
    icon: CupSoda,
    group: "Event Day Operations",
    description: "Manage the drinks & snacks ordering catalog.",
  },
  {
    title: "Digital Signage",
    url: "/admin/signage",
    icon: MonitorPlay,
    group: "Event Day Operations",
    description: "Manage screens and media for digital signage.",
  },
  {
    title: "Email Queue",
    url: "/admin/email-queue",
    icon: Mail,
    group: "Event Day Operations",
    description: "Monitor and manage queued outgoing emails.",
  },
];
