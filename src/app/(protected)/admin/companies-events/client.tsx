"use client";

import * as React from "react";
import { fetchCompaniesAction, fetchCompaniesWithSubOptionsAction, createCompanyAction, updateCompanyAction, createCompanyRepAction, addOptionToCompanyAction, removeOptionFromCompanyAction, addSubOptionToCompanyAction, removeSubOptionFromCompanyAction, addSubOptionToCompanyOnlyAction, removeSubOptionFromCompanyOnlyAction, removeUserFromCompanyAction, processCompaniesCSVAction, resendInviteAction, fetchCompanyOptionsDebugAction } from "@/app/actions/companies";
import { fetchEventsAction, findCompaniesWithEventOptions, addCompaniesToEventPageAction, createEventAction, updateEventAction, deleteEventAction } from "@/app/actions/events";
import { uploadFileAction } from "@/app/actions/media";
import { listMatchingSoftwareAction, createMatchingSoftwareAction } from "@/app/actions/matching-software";
import { fetchAcademicYearsAction } from "@/app/actions/cv-book";
import { fetchFormsAction } from "@/app/actions/forms";
import { fetchSalespersonsAction } from "@/app/actions/salespeople";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
}
from "@tanstack/react-table";
import { ChevronDown, MoreHorizontal, Upload, X } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { IconBuilding, IconCalendarEvent, IconColumns, IconMail, IconPlus, IconTaxEuro, IconFileCv } from "@tabler/icons-react";
import type { AcademicYear, CareerEvent, Company, CompanyRep, CareerEventOption, CareerEventPage, Booth, HeaderButtonType, CareerSubOption } from "@/lib/schema";
import { useUser } from "@/providers/UserProvider";
import type { UserSummary as AppUser } from "@/lib/schema";
import { slugifyCompanyName } from "@/lib/utils/slugify";
import { SimpleRichTextEditor } from "@/components/admin/SimpleRichTextEditor";

/**
 * Notes about typing decisions:
 * - Per your request, company.representatives may be undefined from the backend.
 *   We normalize and operate on Partial<CompanyRep>[] for the users table so new users
 *   can be created without an id/company/etc. yet.
 * - role stays a string id.
 */

/** Option with company's selected sub_options (from junction table) */
type CareerEventOptionWithCompanySubOptions = CareerEventOption & { companySubOptions?: CareerSubOption[] };

/** ------------------------------------------------------------------
 * CompanyRow — allow representatives to be Partial<CompanyRep>[]
 * ------------------------------------------------------------------ */
type CompanyRow = Pick<Company, "id" | "name" | "VAT" | "address" | "salesperson" | "status"> & {
  representatives?: Partial<CompanyRep>[];
  options?: CareerEventOptionWithCompanySubOptions[];
  /** Company-level sub-options (from company.sub_options junction) */
  sub_options?: CareerSubOption[];
  option_history?: NonNullable<Company["option_history"]>;
  sub_option_history?: NonNullable<Company["sub_option_history"]>;
};

export default function LegacyCompaniesEventsClient() {
  const { user } = useUser();
  if (!user?.admin) return <p>NO ACCESS</p>;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 py-6">
      <div>
        <h1 className="text-3xl font-bold">Companies & Events have moved</h1>
        <p className="mt-2 text-muted-foreground">
          These are separate workflows now. Choose what you want to manage.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/admin/companies" className="rounded-xl border bg-card p-6 transition-colors hover:bg-accent">
          <IconBuilding className="mb-4 h-8 w-8" />
          <h2 className="text-xl font-semibold">Companies</h2>
          <p className="mt-2 text-sm text-muted-foreground">Company details, representatives, approvals and purchased options.</p>
        </Link>
        <Link href="/admin/events" className="rounded-xl border bg-card p-6 transition-colors hover:bg-accent">
          <IconCalendarEvent className="mb-4 h-8 w-8" />
          <h2 className="text-xl font-semibold">Events</h2>
          <p className="mt-2 text-sm text-muted-foreground">Recurring event series, annual editions and their public pages.</p>
        </Link>
      </div>
    </div>
  );
}

/** Extract suboption IDs from option (option.sub_options or nested in option.events[].career_event_option_id.sub_options). Handles IDs and expanded objects with career_sub_option_id. */
function getSubOptionIdsFromOption(option: unknown): string[] {
  const extractId = (s: unknown): string => {
    if (typeof s === 'string') return s;
    if (typeof s === 'number') return String(s);
    if (s && typeof s === 'object') {
      if ('career_sub_option_id' in s) {
        const ref = (s as { career_sub_option_id: { id?: string | number } | string | null }).career_sub_option_id;
        if (typeof ref === 'string') return ref;
        if (ref && typeof ref === 'object' && ref.id != null) return String(ref.id);
      }
      if ('career_sub_option' in s) {
        const ref = (s as { career_sub_option: { id?: string | number } | string | null }).career_sub_option;
        if (typeof ref === 'string') return ref;
        if (ref && typeof ref === 'object' && ref.id != null) return String(ref.id);
      }
      if ('id' in s) return String((s as { id: string | number }).id);
    }
    return '';
  };
  if (!option || typeof option !== 'object') return [];
  const raw = option as Record<string, unknown>;
  const topLevel = raw.sub_options as unknown[] | undefined;
  if (Array.isArray(topLevel) && topLevel.length > 0) {
    return topLevel.map(extractId).filter(Boolean);
  }
  const events = raw.events as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(events)) {
    for (const ev of events) {
      const nestedOpt = ev?.career_event_option_id as { sub_options?: unknown[] } | undefined;
      const nested = nestedOpt?.sub_options;
      if (Array.isArray(nested) && nested.length > 0) {
        return nested.map(extractId).filter(Boolean);
      }
    }
  }
  return [];
}

/** Get sub_option IDs from junction (handles various Directus formats) */
function getSubOptionIdsFromJunction(opt: unknown): string[] {
  if (!opt || typeof opt !== 'object') return [];
  const raw = opt as Record<string, unknown>;
  const subOpts = (raw.sub_options ?? raw.career_sub_options ?? raw.sub_option) as unknown[] | undefined;
  if (!Array.isArray(subOpts)) return [];
  return subOpts
    .map((s) => {
      if (typeof s === 'string') return s;
      if (s && typeof s === 'object' && 'id' in s) return (s as { id: string }).id;
      if (s && typeof s === 'object' && 'career_sub_option_id' in s) {
        const ref = (s as { career_sub_option_id: string | { id: string } | null }).career_sub_option_id;
        return typeof ref === 'string' ? ref : ref?.id ?? '';
      }
      if (s && typeof s === 'object' && 'career_sub_option' in s) {
        const ref = (s as { career_sub_option: string | { id: string } | null }).career_sub_option;
        return typeof ref === 'string' ? ref : ref?.id ?? '';
      }
      return '';
    })
    .filter(Boolean);
}

/** Resolve suboption from junction/object format (career_sub_option_id, career_sub_option, or direct) */
function resolveSubOptionFromItem(s: unknown): CareerSubOption | null {
  if (!s || typeof s !== 'object') return null;
  if ('name' in s && typeof (s as { name: unknown }).name === 'string') return s as CareerSubOption;
  if ('career_sub_option_id' in s) {
    const ref = (s as { career_sub_option_id: CareerSubOption | null }).career_sub_option_id;
    return ref && typeof ref === 'object' && 'name' in ref ? (ref as CareerSubOption) : null;
  }
  if ('career_sub_option' in s) {
    const ref = (s as { career_sub_option: CareerSubOption | null }).career_sub_option;
    return ref && typeof ref === 'object' && 'name' in ref ? (ref as CareerSubOption) : null;
  }
  return null;
}

/** Resolve company.sub_options (junction array) to CareerSubOption[] for display. */
function resolveCompanySubOptions(company: unknown, allSubOptions: CareerSubOption[]): CareerSubOption[] {
  const raw = (company && typeof company === "object" && "sub_options" in company)
    ? (company as { sub_options?: unknown }).sub_options
    : undefined;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const byId = new Map(allSubOptions.map((s) => [String(s.id), s]));
  const result: CareerSubOption[] = [];
  const seen = new Set<string>();
  for (const s of raw) {
    let resolved: CareerSubOption | null = null;
    if (s && typeof s === "object" && "name" in s) resolved = s as CareerSubOption;
    else if (s && typeof s === "object" && "career_sub_option_id" in s) {
      const ref = (s as { career_sub_option_id: CareerSubOption | string | null }).career_sub_option_id;
      resolved = ref && typeof ref === "object" ? (ref as CareerSubOption) : (typeof ref === "string" ? byId.get(ref) ?? null : null);
    } else if (typeof s === "string") resolved = byId.get(s) ?? null;
    else if (s && typeof s === "object" && "id" in s) resolved = byId.get(String((s as { id: string }).id)) ?? null;
    if (resolved && !seen.has(String(resolved.id))) {
      seen.add(String(resolved.id));
      result.push(resolved);
    }
  }
  return result;
}

/** Extract company's selected sub_options from company.sub_options, junction, and/or option (handles Directus formats). */
function extractCompanySubOptions(opt: unknown, allSubOptions?: CareerSubOption[], rawOption?: unknown, company?: unknown): CareerSubOption[] {
  const resolveAndReturn = (subOpts: unknown[]): CareerSubOption[] => {
    const resolved = subOpts
      .map((s) => {
        if (s && typeof s === 'object' && 'name' in s) return s as CareerSubOption;
        if (s && typeof s === 'object' && 'career_sub_option_id' in s) {
          const ref = (s as { career_sub_option_id: CareerSubOption | null }).career_sub_option_id;
          return ref && typeof ref === 'object' ? (ref as CareerSubOption) : null;
        }
        if (s && typeof s === 'object' && 'career_sub_option' in s) {
          const ref = (s as { career_sub_option: CareerSubOption | null }).career_sub_option;
          return ref && typeof ref === 'object' ? (ref as CareerSubOption) : null;
        }
        if (typeof s === 'string' && allSubOptions) {
          return allSubOptions.find((a) => a.id === s) ?? null;
        }
        if (s && typeof s === 'object' && 'id' in s && allSubOptions) {
          return allSubOptions.find((a) => a.id === (s as { id: string }).id) ?? null;
        }
        return null;
      })
      .filter((s): s is CareerSubOption => s !== null);
    return resolved;
  };

  // Primary: company.sub_options (company_career_sub_option junction - company-level)
  const companySubs = (company && typeof company === "object" && "sub_options" in company)
    ? (company as { sub_options?: unknown }).sub_options
    : undefined;
  if (Array.isArray(companySubs) && companySubs.length > 0) {
    const resolved = resolveAndReturn(companySubs);
    if (resolved.length > 0) return resolved;
  }

  if (!opt || typeof opt !== 'object') return [];
  const raw = opt as Record<string, unknown>;
  let subOpts = (raw.sub_options ?? raw.career_sub_options ?? raw.sub_option) as unknown[] | undefined;

  // Option's sub_options from nested path (option.events[].career_event_option_id.sub_options) - expanded objects with career_sub_option_id
  if (rawOption && typeof rawOption === 'object') {
    const optionRaw = rawOption as Record<string, unknown>;
    const events = optionRaw.events as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(events)) {
      for (const ev of events) {
        const nestedOpt = ev?.career_event_option_id as { sub_options?: unknown[] } | undefined;
        const nested = nestedOpt?.sub_options;
        if (Array.isArray(nested) && nested.length > 0) {
          const resolved = nested.map(resolveSubOptionFromItem).filter((s): s is CareerSubOption => s != null);
          if (resolved.length > 0) return resolved;
        }
      }
    }
    const topSubOpts = optionRaw.sub_options as unknown[] | undefined;
    if (Array.isArray(topSubOpts) && topSubOpts.length > 0) {
      const resolved = topSubOpts.map(resolveSubOptionFromItem).filter((s): s is CareerSubOption => s != null);
      if (resolved.length > 0) return resolved;
    }
  }

  // Fallback: junction's sub_options (company selected)
  if ((!Array.isArray(subOpts) || subOpts.length === 0) && rawOption) {
    const ids = getSubOptionIdsFromOption(rawOption);
    if (ids.length > 0 && allSubOptions) {
      const byId = new Map(allSubOptions.map((s) => [String(s.id), s]));
      return ids.map((id) => byId.get(id) ?? byId.get(String(id))).filter((s): s is CareerSubOption => Boolean(s));
    }
  }
  if (!Array.isArray(subOpts)) return [];

  const resolved = resolveAndReturn(subOpts);
  if (resolved.length > 0) return resolved;
  // Fallback: resolve by IDs from junction or option
  const ids = getSubOptionIdsFromJunction(opt).length > 0 ? getSubOptionIdsFromJunction(opt) : getSubOptionIdsFromOption(rawOption ?? opt);
  if (ids.length > 0 && allSubOptions) {
    const byId = new Map(allSubOptions.map((s) => [String(s.id), s]));
    return ids.map((id) => byId.get(id) ?? byId.get(String(id))).filter((s): s is CareerSubOption => Boolean(s));
  }
  return [];
}

/** ------------------------------------------------------------------
 * Companies section
 * ------------------------------------------------------------------ */
export function CompaniesSection() {
  const [data, setData] = React.useState<CompanyRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [selectedCompany, setSelectedCompany] = React.useState<CompanyRow | null>(null);
  const [editingCompany, setEditingCompany] = React.useState<CompanyRow | null>(null);
  const [viewMode, setViewMode] = React.useState<"companies" | "users" | "options">("companies");
  const [allSubOptions, setAllSubOptions] = React.useState<CareerSubOption[]>([]);

  const refreshCompanies = React.useCallback(() => {
    setLoading(true);
    fetchCompaniesWithSubOptionsAction()
      .then(({ companies: rows, allSubOptions }) => {
        // Normalize representatives to Partial<CompanyRep>[]
        const mapped: CompanyRow[] = (rows ?? []).map((r: Company & { status?: string }) => ({
          id: r.id,
          name: r.name,
          VAT: r.VAT ?? "",
          address: r.address ?? formatAddress(r),
          salesperson: r.salesperson ?? "",
          status: r.status ?? "",
          representatives: (r.representatives ?? []).map((rep) => ({ ...rep })) as Partial<CompanyRep>[],
          sub_options: resolveCompanySubOptions(r, allSubOptions ?? []),
          option_history: r.option_history ?? [],
          sub_option_history: r.sub_option_history ?? [],
          options: (r.options ?? []).map((opt, optIndex) => {
            // Handle both direct CareerEventOption and junction table format
            let rawOption: CareerEventOption | null = null;
            if (opt && typeof opt === 'object' && 'career_event_option_id' in opt) {
              const junction = opt as { career_event_option_id: CareerEventOption | null };
              rawOption = junction.career_event_option_id;
            } else {
              rawOption = opt as CareerEventOption;
            }
            
            // Ensure we have a valid option with an ID
            if (!rawOption || !rawOption.id) {
              return null;
            }

            const companySubOptions = extractCompanySubOptions(opt, allSubOptions, rawOption, r);

            // Resolve option's sub_options (can be IDs from nested events path) for SubOptionsDialog
            const optionSubOptionIds = getSubOptionIdsFromOption(rawOption);
            const resolvedSubOptions: CareerSubOption[] = optionSubOptionIds.length > 0 && allSubOptions
              ? optionSubOptionIds
                  .map((id) => allSubOptions.find((s) => String(s.id) === String(id)))
                  .filter((s): s is CareerSubOption => Boolean(s))
              : (Array.isArray(rawOption.sub_options) ? rawOption.sub_options : []).filter(
                  (s): s is CareerSubOption => s && typeof s === 'object' && 'name' in s
                );

            // Create a new object to avoid mutation, preserving all fields
            const normalizedOption: CareerEventOptionWithCompanySubOptions = {
              id: rawOption.id,
              name: rawOption.name,
              description: rawOption.description,
              price: rawOption.price,
              sub_options: resolvedSubOptions.length > 0 ? resolvedSubOptions : rawOption.sub_options,
              companySubOptions: companySubOptions.length > 0 ? companySubOptions : undefined,
            };

            // Normalize events: handle junction table format and direct events
            // In Directus many-to-many, events can come in various formats
            if (rawOption.events && Array.isArray(rawOption.events)) {
              // Events might be in junction table format: [{ career_event_id: EventObject }] or direct EventObject[]
              normalizedOption.events = rawOption.events
                .map((eventOrJunction: unknown) => {
                  if (!eventOrJunction || typeof eventOrJunction !== 'object') return null;
                  
                  // Check if it's a junction table entry - try multiple possible field names
                  // Directus junction tables can have different field names
                  const possibleJunctionFields = ['career_event_id', 'career_event', 'event_id', 'event'];
                  for (const fieldName of possibleJunctionFields) {
                    if (fieldName in eventOrJunction) {
                      const junction = eventOrJunction as Record<string, CareerEvent | string | null>;
                      const eventRef = junction[fieldName];
                      if (eventRef && typeof eventRef === 'object') {
                        return eventRef as CareerEvent;
                      }
                    }
                  }
                  
                  // Check if it's a direct event object
                  if ('id' in eventOrJunction && 'name' in eventOrJunction) {
                    return eventOrJunction as CareerEvent;
                  }
                  
                  return null;
                })
                .filter((e): e is CareerEvent => e !== null && e !== undefined);
            } else if (rawOption.event) {
              // Single event exists, convert to array
              if (typeof rawOption.event === 'object' && rawOption.event !== null) {
                normalizedOption.events = [rawOption.event as CareerEvent];
              } else {
                normalizedOption.events = [];
              }
            } else {
              // No events, set empty array
              normalizedOption.events = [];
            }
            
            // Debug: log first option's events structure
            if (optIndex === 0 && normalizedOption.events.length === 0 && (rawOption.events || rawOption.event)) {
              console.log("[Admin] Option events normalization - rawOption structure:", {
                hasEvents: !!rawOption.events,
                eventsType: Array.isArray(rawOption.events) ? 'array' : typeof rawOption.events,
                eventsLength: Array.isArray(rawOption.events) ? rawOption.events.length : 0,
                firstEvent: Array.isArray(rawOption.events) && rawOption.events[0] ? Object.keys(rawOption.events[0] as any) : null,
                hasEvent: !!rawOption.event,
                eventType: typeof rawOption.event,
                allKeys: Object.keys(rawOption),
              });
            }
            
            return normalizedOption;
          }).filter((opt): opt is CareerEventOptionWithCompanySubOptions => opt !== null && opt !== undefined && opt.id !== undefined),
        }));
        setData(mapped);
        setAllSubOptions(allSubOptions ?? []);
        setSelectedCompany((prev) => {
          if (!prev) return prev;
          const updated = mapped.find((c) => c.id === prev.id);
          return updated ?? prev;
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    let alive = true;
    fetchCompaniesWithSubOptionsAction()
      .then(({ companies: rows, allSubOptions }) => {
        if (!alive) return;
        // Normalize representatives to Partial<CompanyRep>[]
        const mapped: CompanyRow[] = (rows ?? []).map((r: Company & { status?: string }) => ({
          id: r.id,
          name: r.name,
          VAT: r.VAT ?? "",
          address: r.address ?? formatAddress(r),
          salesperson: r.salesperson ?? "",
          status: r.status ?? "",
          representatives: (r.representatives ?? []).map((rep) => ({ ...rep })) as Partial<CompanyRep>[],
          sub_options: resolveCompanySubOptions(r, allSubOptions ?? []),
          option_history: r.option_history ?? [],
          sub_option_history: r.sub_option_history ?? [],
          options: (r.options ?? []).map((opt, optIndex) => {
            // Handle both direct CareerEventOption and junction table format
            let rawOption: CareerEventOption | null = null;
            if (opt && typeof opt === 'object' && 'career_event_option_id' in opt) {
              const junction = opt as { career_event_option_id: CareerEventOption | null };
              rawOption = junction.career_event_option_id;
            } else {
              rawOption = opt as CareerEventOption;
            }
            
            // Ensure we have a valid option with an ID
            if (!rawOption || !rawOption.id) {
              return null;
            }

            const companySubOptions = extractCompanySubOptions(opt, allSubOptions, rawOption, r);

            // Resolve option's sub_options (can be IDs from nested events path) for SubOptionsDialog
            const optionSubOptionIds = getSubOptionIdsFromOption(rawOption);
            const resolvedSubOptions: CareerSubOption[] = optionSubOptionIds.length > 0 && allSubOptions
              ? optionSubOptionIds
                  .map((id) => allSubOptions.find((s) => String(s.id) === String(id)))
                  .filter((s): s is CareerSubOption => Boolean(s))
              : (Array.isArray(rawOption.sub_options) ? rawOption.sub_options : []).filter(
                  (s): s is CareerSubOption => s && typeof s === 'object' && 'name' in s
                );

            // Create a new object to avoid mutation, preserving all fields
            const normalizedOption: CareerEventOptionWithCompanySubOptions = {
              id: rawOption.id,
              name: rawOption.name,
              description: rawOption.description,
              price: rawOption.price,
              sub_options: resolvedSubOptions.length > 0 ? resolvedSubOptions : rawOption.sub_options,
              companySubOptions: companySubOptions.length > 0 ? companySubOptions : undefined,
            };

            // Normalize events: handle junction table format and direct events
            // In Directus many-to-many, events can come in various formats
            if (rawOption.events && Array.isArray(rawOption.events)) {
              // Events might be in junction table format: [{ career_event_id: EventObject }] or direct EventObject[]
              normalizedOption.events = rawOption.events
                .map((eventOrJunction: unknown) => {
                  if (!eventOrJunction || typeof eventOrJunction !== 'object') return null;
                  
                  // Check if it's a junction table entry - try multiple possible field names
                  // Directus junction tables can have different field names
                  const possibleJunctionFields = ['career_event_id', 'career_event', 'event_id', 'event'];
                  for (const fieldName of possibleJunctionFields) {
                    if (fieldName in eventOrJunction) {
                      const junction = eventOrJunction as Record<string, CareerEvent | string | null>;
                      const eventRef = junction[fieldName];
                      if (eventRef && typeof eventRef === 'object') {
                        return eventRef as CareerEvent;
                      }
                    }
                  }
                  
                  // Check if it's a direct event object
                  if ('id' in eventOrJunction && 'name' in eventOrJunction) {
                    return eventOrJunction as CareerEvent;
                  }
                  
                  return null;
                })
                .filter((e): e is CareerEvent => e !== null && e !== undefined);
            } else if (rawOption.event) {
              // Single event exists, convert to array
              if (typeof rawOption.event === 'object' && rawOption.event !== null) {
                normalizedOption.events = [rawOption.event as CareerEvent];
              } else {
                normalizedOption.events = [];
              }
            } else {
              // No events, set empty array
              normalizedOption.events = [];
            }
            
            // Debug: log first option's events structure
            if (optIndex === 0 && normalizedOption.events.length === 0 && (rawOption.events || rawOption.event)) {
              console.log("[Admin useEffect] Option events normalization - rawOption structure:", {
                hasEvents: !!rawOption.events,
                eventsType: Array.isArray(rawOption.events) ? 'array' : typeof rawOption.events,
                eventsLength: Array.isArray(rawOption.events) ? rawOption.events.length : 0,
                firstEvent: Array.isArray(rawOption.events) && rawOption.events[0] ? Object.keys(rawOption.events[0] as any) : null,
                hasEvent: !!rawOption.event,
                eventType: typeof rawOption.event,
                allKeys: Object.keys(rawOption),
              });
            }
            
            return normalizedOption;
          }).filter((opt): opt is CareerEventOptionWithCompanySubOptions => opt !== null && opt !== undefined && opt.id !== undefined),
        }));
        setData(mapped);
        setAllSubOptions(allSubOptions ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    return () => { alive = false; };
  }, []);

  const table = useReactTable<CompanyRow>({
    data,
    columns: getCompanyColumns(
      (company) => { setSelectedCompany(company); setViewMode("users"); },
      (company) => { setSelectedCompany(company); setViewMode("options"); },
      (company) => { setEditingCompany(company); }
    ),
    state: { sorting, columnFilters, columnVisibility, rowSelection, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      if (!filterValue) return true;
      const q = String(filterValue).toLowerCase();
      const name = String(row.getValue("name") ?? "").toLowerCase();
      const vat = String(row.getValue("VAT") ?? "").toLowerCase();
      return name.includes(q) || vat.includes(q);
    },
  });

  const salespersonOptions = React.useMemo(
    () => Array.from(new Set(data.map(d => d.salesperson).filter(Boolean))).sort() as string[],
    [data]
  );

  // Debug: log raw options structure + allSubOptions when viewing a company with options (check browser console)
  React.useEffect(() => {
    if (selectedCompany?.id && (selectedCompany.options?.length ?? 0) > 0 && process.env.NODE_ENV === "development") {
      fetchCompanyOptionsDebugAction(selectedCompany.id).then(({ options, allSubOptions, junctionDiscovery, error }) => {
        if (error) console.warn("[Admin] Options debug error:", error);
        else {
          console.log("[Admin] Raw options structure for", selectedCompany.name, ":", JSON.stringify(options, null, 2));
          if (allSubOptions?.length) console.log("[Admin] allSubOptions IDs:", allSubOptions.map((s) => (s as CareerSubOption).id));
          if (junctionDiscovery) console.log("[Admin] Junction discovery (ids 7,8,9,18 are junction IDs):", junctionDiscovery);
        }
      });
    }
  }, [selectedCompany?.id, selectedCompany?.name, selectedCompany?.options?.length]);

  // helper to persist a new user locally (updates both `data` and `selectedCompany`)
  const addUserToCompany = React.useCallback((companyId: string, newUser: Partial<CompanyRep>) => {
    setData(prev => prev.map(c => {
      if (c.id !== companyId) return c;
      return {
        ...c,
        representatives: [...(c.representatives ?? []), newUser],
      };
    }));
    if (selectedCompany?.id === companyId) {
      setSelectedCompany(prev => prev ? { ...prev, representatives: [...(prev.representatives ?? []), newUser] } : prev);
    }
  }, [selectedCompany]);

  // helper to persist a new option locally (updates both `data` and `selectedCompany`)
  const addOptionToCompany = React.useCallback((companyId: string, newOption: CareerEventOption) => {
    setData(prev => prev.map(c => {
      if (c.id !== companyId) return c;
      return {
        ...c,
        options: [...(c.options ?? []), newOption],
      };
    }));
    if (selectedCompany?.id === companyId) {
      setSelectedCompany(prev => prev ? { ...prev, options: [...(prev.options ?? []), newOption] } : prev);
    }
  }, [selectedCompany]);

  // helper to remove an option locally (updates both `data` and `selectedCompany`)
  const removeOptionFromCompany = React.useCallback((companyId: string, optionId: string) => {
    setData(prev => prev.map(c => {
      if (c.id !== companyId) return c;
      return {
        ...c,
        options: (c.options ?? []).filter(opt => opt.id !== optionId),
      };
    }));
    if (selectedCompany?.id === companyId) {
      setSelectedCompany(prev => prev ? { ...prev, options: (prev.options ?? []).filter(opt => opt.id !== optionId) } : prev);
    }
  }, [selectedCompany]);

  // helper to remove a user locally (updates both `data` and `selectedCompany`)
  const removeUserFromCompany = React.useCallback((companyId: string, userId: string) => {
    setData(prev => prev.map(c => {
      if (c.id !== companyId) return c;
      return {
        ...c,
        representatives: (c.representatives ?? []).filter(rep => rep && rep.id !== userId),
      };
    }));
    if (selectedCompany?.id === companyId) {
      setSelectedCompany(prev => prev ? { ...prev, representatives: (prev.representatives ?? []).filter(rep => rep && rep.id !== userId) } : prev);
    }
  }, [selectedCompany]);

  return (
    <Card className="rounded-2xl shadow-md">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <CardTitle className="text-xl sm:text-2xl">
          {selectedCompany && viewMode === "users" ? `Manage Users: ${selectedCompany.name}` :
           selectedCompany && viewMode === "options" ? `Manage Options: ${selectedCompany.name}` :
           "Manage Companies"}
        </CardTitle>
        <div className="flex items-center gap-2">
          {selectedCompany && (
            <Button variant="outline" size="sm" onClick={() => { setSelectedCompany(null); setViewMode("companies"); }} className="w-full sm:w-auto">Back to Companies</Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <EditCompanyDialog
          company={editingCompany}
          onClose={() => setEditingCompany(null)}
          onSaved={refreshCompanies}
        />
        {!selectedCompany ? (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                placeholder="Filter companies..."
                value={table.getState().globalFilter ?? ""}
                onChange={e => table.setGlobalFilter(e.target.value)}
                className="max-w-sm w-full sm:w-auto"
              />
              <Select
                value={(table.getColumn("salesperson")?.getFilterValue() ?? "") as string}
                onValueChange={(val) => table.getColumn("salesperson")?.setFilterValue(val === "__all__" ? undefined : val)}
              >
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Filter on salesperson" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="__all__" value="__all__">All</SelectItem>
                  {salespersonOptions.map(name => <SelectItem key={String(name)} value={String(name)}>{name}</SelectItem>)}
                </SelectContent>
              </Select>

              <CompanyFormDialog
                onRefresh={refreshCompanies}
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto"><IconColumns className="hidden sm:inline" /> <span className="hidden sm:inline">Columns </span><ChevronDown className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {table.getAllColumns()
                    .filter(c => c.getCanHide())
                    .map(c => (
                      <DropdownMenuCheckboxItem
                        key={c.id}
                        checked={c.getIsVisible()}
                        onCheckedChange={v => c.toggleVisibility(v)}
                        className="capitalize"
                      >
                        {c.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-4 overflow-x-auto rounded-md border">
              <div className="min-w-full">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map(headerGroup => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                          <TableHead key={header.id} className="whitespace-nowrap">
                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : table.getRowModel().rows.length ? (
                      table.getRowModel().rows.map(row => {
                        const company = row.original as CompanyRow;
                        const isUnpublished = company.status !== "published";
                        return (
                          <TableRow
                            key={row.id}
                            className={isUnpublished ? "bg-red-50/80 dark:bg-red-950/20" : undefined}
                          >
                            {row.getVisibleCells().map(cell => (
                              <TableCell key={cell.id} className="whitespace-nowrap">{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                            ))}
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
                          No results.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="text-muted-foreground text-xs sm:text-sm">
                {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
              </div>
              <div className="flex space-x-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="flex-1 sm:flex-initial">Previous</Button>
                <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="flex-1 sm:flex-initial">Next</Button>
              </div>
            </div>
          </>
        ) : viewMode === "users" ? (
          <CompanyUsersTable
            company={selectedCompany}
            onAddUser={(newUser) => {
              // locally add partial user and also update main data list
              addUserToCompany(selectedCompany.id, newUser);
            }}
            onRemoveUser={(userId) => {
              // locally remove user and also update main data list
              removeUserFromCompany(selectedCompany.id, userId);
            }}
          />
        ) : viewMode === "options" ? (
          <div className="space-y-8">
            <section className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold">Current academic year</h3>
                <p className="text-sm text-muted-foreground">
                  These purchases are active and can be changed here.
                </p>
              </div>
              <CompanySubOptionsSection
                company={selectedCompany}
                allSubOptions={allSubOptions}
                onSubOptionsChange={() => refreshCompanies()}
              />
              <CompanyOptionsTable
                company={selectedCompany}
                onAddOption={(newOption) => {
                  addOptionToCompany(selectedCompany.id, newOption);
                }}
                onRemoveOption={(optionId) => {
                  removeOptionFromCompany(selectedCompany.id, optionId);
                }}
                onSubOptionsChange={() => refreshCompanies()}
              />
            </section>
            <CompanyOptionHistory company={selectedCompany} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** ------------------------------------------------------------------
 * Company columns
 * ------------------------------------------------------------------ */
function getCompanyColumns(onViewUsers: (company: CompanyRow) => void, onViewOptions: (company: CompanyRow) => void, onEditCompany: (company: CompanyRow) => void): ColumnDef<CompanyRow>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={v => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={v => row.toggleSelected(!!v)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 24,
    },
    { accessorKey: "name", header: "Name", cell: ({ row }) => <div className="capitalize">{row.getValue("name")}</div> },
    { accessorKey: "VAT", header: "VAT", cell: ({ row }) => <div className="font-mono text-xs">{row.getValue("VAT")}</div> },
    { accessorKey: "address", header: "Address", cell: ({ row }) => <div className="truncate max-w-[32ch]">{row.getValue("address")}</div> },
    {
      accessorKey: "salesperson",
      header: () => <div className="text-right">Assignee</div>,
      cell: ({ row }) => <div className="text-right font-medium">{row.getValue("salesperson") || "—"}</div>,
      enableColumnFilter: true,
      filterFn: (row, id, value: string) => !value || row.getValue(id) === value,
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const company = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onViewUsers(company)}>View users</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewOptions(company)}>View options</DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/company/${slugifyCompanyName(company.name)}`}>
                  View company page
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => console.log("Vacancies for", company.id)}>View vacancies</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEditCompany(company)}>Edit Company</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

/** ------------------------------------------------------------------
 * Company Users Table (full-featured)
 * - uses Partial<CompanyRep> for data so newly created users can be partial
 * ------------------------------------------------------------------ */
function CompanyUsersTable({ company, onAddUser, onRemoveUser }: { company: CompanyRow; onAddUser: (newUser: Partial<CompanyRep>) => void; onRemoveUser: (userId: string) => void }) {
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  // Local state to allow adding partial users immediately
  const [localRows, setLocalRows] = React.useState<Partial<CompanyRep>[]>(company.representatives ?? []);

  // keep localRows in sync when company changes (e.g. when switching companies)
  React.useEffect(() => {
    setLocalRows(company.representatives ?? []);
  }, [company.id, company.representatives]);

  const table = useReactTable<Partial<CompanyRep>>({
    data: localRows,
    columns: getUserColumns(onRemoveUser, company.id) as ColumnDef<Partial<CompanyRep>>[],
    state: { globalFilter, columnFilters, columnVisibility, rowSelection, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      if (!filterValue) return true;
      const q = String(filterValue).toLowerCase();
      const first = String(row.getValue("first_name") ?? "").toLowerCase();
      const last = String(row.getValue("last_name") ?? "").toLowerCase();
      const email = String(row.getValue("email") ?? "").toLowerCase();
      return first.includes(q) || last.includes(q) || email.includes(q);
    },
  });

  // Called by UserFormDialog. Persist locally and call parent callback to update outer state.
  const handleCreate = (newUser: Partial<CompanyRep>) => {
    // append locally
    setLocalRows(prev => [...prev, newUser]);
    // notify parent to update main data array + selectedCompany
    onAddUser(newUser);
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <Input
          placeholder="Filter users..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm w-full sm:w-auto"
        />

        <UserFormDialog company={company} onCreate={handleCreate} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto"><IconColumns className="hidden sm:inline" /> <span className="hidden sm:inline">Columns </span><ChevronDown className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table.getAllColumns().filter(c => c.getCanHide()).map(c => (
              <DropdownMenuCheckboxItem
                key={c.id}
                checked={c.getIsVisible()}
                onCheckedChange={(v) => c.toggleVisibility(v)}
                className="capitalize"
              >
                {c.id}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <div className="min-w-full">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map(hg => (
                <TableRow key={hg.id}>
                  {hg.headers.map(h => (
                    <TableHead key={h.id} className="whitespace-nowrap">{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? table.getRowModel().rows.map(row => (
                <TableRow key={row.id ?? JSON.stringify(row.getValue("email") ?? row.getValue("first_name") ?? row.index)}>
                  {row.getVisibleCells().map(cell => <TableCell key={cell.id} className="whitespace-nowrap">{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">No users found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="text-muted-foreground text-xs sm:text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex space-x-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="flex-1 sm:flex-initial">Previous</Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="flex-1 sm:flex-initial">Next</Button>
        </div>
      </div>
    </>
  );
}

/** ------------------------------------------------------------------
 * User columns definition (no 'role')
 * Using Partial<CompanyRep> friendly renderers
 * ------------------------------------------------------------------ */
function getUserColumns(onRemoveUser: (userId: string) => void, companyId: string): ColumnDef<Partial<CompanyRep>>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 24,
    },
    {
      accessorKey: "first_name",
      header: "First name",
      cell: ({ row }) => <div className="capitalize">{String(row.getValue("first_name") ?? "")}</div>,
    },
    {
      accessorKey: "last_name",
      header: "Last name",
      cell: ({ row }) => <div className="capitalize">{String(row.getValue("last_name") ?? "")}</div>,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <div className="truncate max-w-[36ch]">{String(row.getValue("email") ?? "")}</div>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <div className="font-medium">{String(row.getValue("status") ?? "—")}</div>,
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const user = row.original;
        const [isResending, setIsResending] = React.useState(false);
        const userStatus = user?.status;
        const isInvited = userStatus === "invited";

        const handleResendInvite = async () => {
          if (!user?.id) return;
          
          setIsResending(true);
          try {
            const result = await resendInviteAction(user.id, companyId);
            if (result.success) {
              // You could add a toast notification here
              console.log("Invitation resent successfully");
            } else {
              console.error("Failed to resend invitation:", result.error);
              alert(`Failed to resend invitation: ${result.error || "Unknown error"}`);
            }
          } catch (error) {
            console.error("Error resending invitation:", error);
            alert(`Error resending invitation: ${error instanceof Error ? error.message : "Unknown error"}`);
          } finally {
            setIsResending(false);
          }
        };

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => console.log("Edit user", user)}>Edit</DropdownMenuItem>
              {user?.id && isInvited && (
                <DropdownMenuItem 
                  onClick={handleResendInvite}
                  disabled={isResending}
                >
                  {isResending ? "Resending..." : "Resend invite"}
                </DropdownMenuItem>
              )}
              {user?.id && (
                <>
                  <DropdownMenuSeparator />
                  <RemoveUserDialog
                    user={user}
                    companyId={companyId}
                    onRemove={() => onRemoveUser(user.id!)}
                  />
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

/** ------------------------------------------------------------------
 * UserFormDialog (returns Partial<CompanyRep>)
 * ------------------------------------------------------------------ */
function UserFormDialog({ company, onCreate }: {
  company: CompanyRow;
  onCreate: (newUser: Partial<CompanyRep>) => void;
}) {
  const [open, setOpen] = React.useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const newUser: Partial<CompanyRep> = {
      first_name: String(fd.get("firstName") ?? "").trim() || undefined,
      last_name: String(fd.get("lastName") ?? "").trim() || undefined,
      email: String(fd.get("email") ?? "").trim() || undefined,
      tel: String(fd.get("number") ?? "").trim() || undefined,
      title: String(fd.get("funct") ?? "").trim() || undefined,
      role: "d5475bf4-a77f-48de-b06c-fac199b0f631", // fixed role id as requested
      status: "invited",
    };

    createCompanyRepAction(company.id, newUser)

    onCreate(newUser); // parent will incorporate into CompanyRow.representatives
    setOpen(false);
    (e.target as HTMLFormElement).reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><IconPlus /> Add User</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Request New Representative</DialogTitle>
            <DialogDescription>Fill in the representative details below.</DialogDescription>
          </DialogHeader>

          <div className="w-full">
            <Label htmlFor="firstName" className="text-xs">First Name*</Label>
            <Input name="firstName" id="firstName" required />
          </div>
          <div className="w-full">
            <Label htmlFor="lastName" className="text-xs">Last Name*</Label>
            <Input name="lastName" id="lastName" required />
          </div>
          <div className="w-full">
            <Label htmlFor="email" className="text-xs">E-mail address*</Label>
            <Input name="email" id="email" type="email" required />
          </div>
          <div className="w-full">
            <Label htmlFor="number" className="text-xs">Phone number</Label>
            <Input name="number" id="number" />
          </div>
          <div className="w-full">
            <Label htmlFor="funct" className="text-xs">Function</Label>
            <Input name="funct" id="funct" />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="submit" className="w-full sm:w-auto">Submit</Button>
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** ------------------------------------------------------------------
 * Company Sub-Options Section (company-level only, no option required)
 * - allows giving a company sub-options without any option
 * ------------------------------------------------------------------ */
function CompanySubOptionsSection({ company, allSubOptions, onSubOptionsChange }: {
  company: CompanyRow;
  allSubOptions: CareerSubOption[];
  onSubOptionsChange: () => void;
}) {
  const [adding, setAdding] = React.useState(false);
  const companySubs = company.sub_options ?? [];
  const availableToAdd = allSubOptions.filter(
    (s) => !companySubs.some((c) => String(c.id) === String(s.id))
  );

  const handleAdd = async (subOptionId: string) => {
    setAdding(true);
    try {
      const updated = await addSubOptionToCompanyOnlyAction(company.id, subOptionId);
      if (updated) onSubOptionsChange();
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (subOptionId: string) => {
    try {
      const updated = await removeSubOptionFromCompanyOnlyAction(company.id, subOptionId);
      if (updated) onSubOptionsChange();
    } catch (e) {
      console.error("[CompanySubOptionsSection] Remove failed:", e);
    }
  };

  return (
    <div className="mb-4 p-4 rounded-lg border bg-muted/30">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium">Company sub-options</span>
        <span className="text-muted-foreground text-xs">(without requiring an option)</span>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        {companySubs.map((s) => (
          <span
            key={s.id}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-sm"
          >
            {s.name}
            <button
              type="button"
              onClick={() => handleRemove(String(s.id))}
              className="hover:bg-primary/20 rounded p-0.5"
              aria-label={`Remove ${s.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {availableToAdd.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={adding}>
                <IconPlus className="h-4 w-4 mr-1" /> Add sub-option
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {availableToAdd.map((s) => {
                const subId = String(s.id);
                return (
                  <DropdownMenuItem
                    key={s.id}
                    onSelect={(e) => {
                      const id = (e.currentTarget as HTMLElement)?.getAttribute?.("data-suboption-id") ?? subId;
                      handleAdd(id);
                    }}
                    data-suboption-id={subId}
                  >
                    {s.name}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

/** ------------------------------------------------------------------
 * Company Options Table (full-featured)
 * - displays all options a company has
 * ------------------------------------------------------------------ */
function CompanyOptionsTable({ company, onAddOption, onRemoveOption, onSubOptionsChange }: {
  company: CompanyRow;
  onAddOption: (newOption: CareerEventOption) => void;
  onRemoveOption: (optionId: string) => void;
  onSubOptionsChange?: () => void;
}) {
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  // Local state to allow adding options immediately
  const [localRows, setLocalRows] = React.useState<CareerEventOption[]>(company.options ?? []);

  // keep localRows in sync when company changes (e.g. when switching companies)
  React.useEffect(() => {
    setLocalRows(company.options ?? []);
  }, [company.id, company.options]);

  const table = useReactTable<CareerEventOptionWithCompanySubOptions>({
    data: localRows,
    columns: getOptionColumns(onRemoveOption, company.id, onSubOptionsChange) as ColumnDef<CareerEventOptionWithCompanySubOptions>[],
    state: { globalFilter, columnFilters, columnVisibility, rowSelection, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      if (!filterValue) return true;
      const q = String(filterValue).toLowerCase();
      const name = String(row.getValue("name") ?? "").toLowerCase();
      const description = String(row.getValue("description") ?? "").toLowerCase();
      const option = row.original;
      // Check events (multiple events)
      let eventNames: string[] = [];
      if (option.events && Array.isArray(option.events)) {
        eventNames = option.events
          .map(event => {
            if (typeof event === 'object' && event !== null && 'name' in event) {
              return String(event.name).toLowerCase();
            }
            return null;
          })
          .filter((name): name is string => name !== null);
      } else if (option.event) {
        // Fallback for backward compatibility
        if (typeof option.event === 'object' && 'name' in option.event) {
          eventNames = [String(option.event.name).toLowerCase()];
        }
      }
      const eventMatch = eventNames.some(eventName => eventName.includes(q));
      return name.includes(q) || description.includes(q) || eventMatch;
    },
  });

  // Called by OptionFormDialog. Persist locally and call parent callback to update outer state.
  const handleCreate = (newOption: CareerEventOption) => {
    // append locally
    setLocalRows(prev => [...prev, newOption]);
    // notify parent to update main data array + selectedCompany
    onAddOption(newOption);
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <Input
          placeholder="Filter options..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm w-full sm:w-auto"
        />

        <OptionFormDialog company={company} onCreate={handleCreate} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto"><IconColumns className="hidden sm:inline" /> <span className="hidden sm:inline">Columns </span><ChevronDown className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table.getAllColumns().filter(c => c.getCanHide()).map(c => (
              <DropdownMenuCheckboxItem
                key={c.id}
                checked={c.getIsVisible()}
                onCheckedChange={(v) => c.toggleVisibility(v)}
                className="capitalize"
              >
                {c.id}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <div className="min-w-full">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map(hg => (
                <TableRow key={hg.id}>
                  {hg.headers.map(h => (
                    <TableHead key={h.id} className="whitespace-nowrap">{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? table.getRowModel().rows.map(row => (
                <TableRow key={row.original.id ?? row.index}>
                  {row.getVisibleCells().map(cell => <TableCell key={cell.id} className="whitespace-nowrap">{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">No options found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="text-muted-foreground text-xs sm:text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex space-x-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="flex-1 sm:flex-initial">Previous</Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="flex-1 sm:flex-initial">Next</Button>
        </div>
      </div>
    </>
  );
}

type CompanyOptionHistoryRow = {
  id: string;
  kind: "Option" | "Sub-option";
  name: string;
  price: number | string | null;
  status: string;
  dateCreated: string | null;
  academicYear: AcademicYear | null;
  events: string[];
};

function getHistoryEventNames(option: CareerEventOption | null | undefined): string[] {
  if (!option) return [];

  const readName = (eventOrJunction: unknown): string | null => {
    if (!eventOrJunction || typeof eventOrJunction !== "object") return null;

    const record = eventOrJunction as Record<string, unknown>;
    for (const field of ["career_event_id", "career_event", "event_id", "event"]) {
      const event = record[field];
      if (event && typeof event === "object" && "name" in event) {
        return String((event as { name: unknown }).name);
      }
    }

    return "name" in record ? String(record.name) : null;
  };

  const events = Array.isArray(option.events)
    ? option.events.map(readName).filter((name): name is string => Boolean(name))
    : [];

  if (events.length > 0) return Array.from(new Set(events));
  const fallback = readName(option.event);
  return fallback ? [fallback] : [];
}

function academicYearHasEnded(year: AcademicYear | null): boolean {
  if (!year?.end_of_year) return true;
  const endValue = /^\d{4}-\d{2}-\d{2}$/.test(year.end_of_year)
    ? `${year.end_of_year}T23:59:59.999`
    : year.end_of_year;
  const endDate = new Date(endValue);
  return Number.isNaN(endDate.getTime()) || endDate.getTime() < Date.now();
}

function formatHistoricalPrice(price: number | string | null): string {
  if (price === null || price === undefined || String(price).trim() === "") return "—";
  const value = String(price).trim();
  if (/^[€$£]/.test(value) || /free/i.test(value)) return value;
  return `€${value}`;
}

function formatHistoryDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

/** Read-only reference of purchases from completed academic years. */
function CompanyOptionHistory({ company }: { company: CompanyRow }) {
  const rows: CompanyOptionHistoryRow[] = [
    ...(company.option_history ?? []).map((entry) => ({
      id: `option-${entry.id}`,
      kind: "Option" as const,
      name: entry.name_at_sale || entry.option?.name || "Unknown option",
      price: entry.price_at_sale,
      status: entry.status,
      dateCreated: entry.date_created ?? null,
      academicYear: entry.academic_year,
      events: getHistoryEventNames(entry.option),
    })),
    ...(company.sub_option_history ?? []).map((entry) => ({
      id: `sub-option-${entry.id}`,
      kind: "Sub-option" as const,
      name: entry.name_at_sale || entry.sub_option?.name || "Unknown sub-option",
      price: entry.price_at_sale,
      status: entry.status,
      dateCreated: entry.date_created ?? null,
      academicYear: entry.academic_year,
      events: [],
    })),
  ].filter((entry) => academicYearHasEnded(entry.academicYear));

  const yearGroups = Array.from(
    rows.reduce((groups, row) => {
      const key = row.academicYear?.id ? String(row.academicYear.id) : "unknown";
      const existing = groups.get(key);
      if (existing) existing.rows.push(row);
      else groups.set(key, { academicYear: row.academicYear, rows: [row] });
      return groups;
    }, new Map<string, { academicYear: AcademicYear | null; rows: CompanyOptionHistoryRow[] }>()).values()
  ).sort((a, b) => {
    const aStart = a.academicYear?.start_of_year ? new Date(a.academicYear.start_of_year).getTime() : 0;
    const bStart = b.academicYear?.start_of_year ? new Date(b.academicYear.start_of_year).getTime() : 0;
    return bStart - aStart;
  });

  for (const group of yearGroups) {
    group.rows.sort((a, b) => {
      const dateDifference = new Date(b.dateCreated ?? 0).getTime() - new Date(a.dateCreated ?? 0).getTime();
      return dateDifference || a.name.localeCompare(b.name);
    });
  }

  return (
    <section className="space-y-3 border-t pt-6">
      <div>
        <h3 className="text-lg font-semibold">Previous academic years</h3>
        <p className="text-sm text-muted-foreground">
          Read-only purchase history. Names and prices are the values recorded at the time of sale.
        </p>
      </div>

      {yearGroups.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No purchases recorded for previous academic years.
        </div>
      ) : (
        <div className="space-y-4">
          {yearGroups.map((group) => (
            <div key={group.academicYear?.id ?? "unknown"} className="overflow-hidden rounded-md border">
              <div className="border-b bg-muted/40 px-4 py-3">
                <h4 className="font-semibold">{group.academicYear?.name ?? "Legacy / unknown academic year"}</h4>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Events</TableHead>
                      <TableHead>Sale price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Recorded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="min-w-56 font-medium">{row.name}</TableCell>
                        <TableCell className="whitespace-nowrap">{row.kind}</TableCell>
                        <TableCell className="min-w-48">{row.events.length > 0 ? row.events.join(", ") : "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatHistoricalPrice(row.price)}</TableCell>
                        <TableCell>
                          <span className={row.status === "sold"
                            ? "inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                            : "inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                          }>
                            {row.status === "sold" ? "Purchased" : row.status}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatHistoryDate(row.dateCreated)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** ------------------------------------------------------------------
 * Helper function to strip HTML tags from description
 * ------------------------------------------------------------------ */
function stripHtml(html: string): string {
  if (!html) return "";
  // Create a temporary DOM element to parse HTML
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

/** ------------------------------------------------------------------
 * SubOptionsDialog - manage sub-options for a company's option
 * ------------------------------------------------------------------ */
function SubOptionsDialog({
  companyId,
  option,
  companySubOptions,
  availableSubOptions,
  onUpdate,
}: {
  companyId: string;
  option: CareerEventOptionWithCompanySubOptions;
  companySubOptions: CareerSubOption[];
  availableSubOptions: CareerSubOption[];
  onUpdate?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [allSubOptions, setAllSubOptions] = React.useState<CareerSubOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // If option has no sub_options defined, fetch all from career_sub_option
  const subOptionsToShow = availableSubOptions.length > 0 ? availableSubOptions : allSubOptions;

  React.useEffect(() => {
    if (open && availableSubOptions.length === 0) {
      setLoading(true);
      import("@/lib/repos/option")
        .then(({ listCareerSubOptions }) => listCareerSubOptions())
        .then((opts) => {
          setAllSubOptions(opts ?? []);
        })
        .finally(() => setLoading(false));
    }
  }, [open, availableSubOptions.length]);

  const companySubIds = new Set(companySubOptions.map((s) => String(s.id)));
  const canAdd = subOptionsToShow.filter((s) => !companySubIds.has(String(s.id)));
  const canRemove = companySubOptions;

  const handleAdd = async (subOptionId: string) => {
    setError(null);
    setActionLoading(subOptionId);
    try {
      const result = await addSubOptionToCompanyAction(companyId, option.id, subOptionId);
      if (result) {
        onUpdate?.();
      } else {
        setError("Failed to add sub-option. The company may not have this option, or the update could not be saved.");
      }
    } catch (e) {
      console.error("Error adding sub-option:", e);
      setError(e instanceof Error ? e.message : "Failed to add sub-option");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (subOptionId: string) => {
    setError(null);
    setActionLoading(subOptionId);
    try {
      const result = await removeSubOptionFromCompanyAction(companyId, option.id, subOptionId);
      if (result !== null) {
        onUpdate?.();
      } else {
        setError("Failed to remove sub-option.");
      }
    } catch (e) {
      console.error("Error removing sub-option:", e);
      setError(e instanceof Error ? e.message : "Failed to remove sub-option");
    } finally {
      setActionLoading(null);
    }
  };

  const displayText = companySubOptions.length > 0
    ? companySubOptions.map((s) => s.name).join(", ")
    : "—";

  const handleOpenChange = (next: boolean) => {
    if (!next) setError(null);
    setOpen(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 text-left font-normal max-w-[200px] truncate">
          {displayText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sub-options for {option.name}</DialogTitle>
          <DialogDescription>
            Add or remove sub-options for this company&apos;s {option.name} package.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading sub-options...</div>
          ) : subOptionsToShow.length === 0 ? (
            <div className="text-sm text-muted-foreground">No sub-options available for this option.</div>
          ) : (
            <>
              <div>
                <Label className="text-xs">Current sub-options</Label>
                {canRemove.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {canRemove.map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-sm"
                      >
                        {s.name}
                        <button
                          type="button"
                          onClick={() => handleRemove(s.id)}
                          className="ml-1 rounded hover:bg-destructive/20 disabled:opacity-50"
                          aria-label={`Remove ${s.name}`}
                          disabled={actionLoading !== null}
                        >
                          {actionLoading === s.id ? "…" : <X className="h-3 w-3" />}
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">None selected</p>
                )}
              </div>
              <div>
                <Label className="text-xs">Add sub-option</Label>
                {canAdd.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {canAdd.map((s) => (
                      <Button
                        key={s.id}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleAdd(s.id)}
                        disabled={actionLoading !== null}
                      >
                        {actionLoading === s.id ? "..." : `+ ${s.name}`}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">All sub-options already added</p>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** ------------------------------------------------------------------
 * Option columns definition
 * ------------------------------------------------------------------ */
function getOptionColumns(
  onRemoveOption: (optionId: string) => void,
  companyId: string,
  onSubOptionsChange?: () => void
): ColumnDef<CareerEventOptionWithCompanySubOptions>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 24,
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <div className="font-medium">{String(row.getValue("name") ?? "")}</div>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => {
        const description = String(row.getValue("description") ?? "");
        const plainText = stripHtml(description);
        return <div className="truncate max-w-[48ch]">{plainText}</div>;
      },
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => <div className="font-medium">{String(row.getValue("price") ?? "—")}</div>,
    },
    {
      id: "sub_options",
      header: "Sub-options",
      cell: ({ row }) => {
        const option = row.original;
        const companySubs = option.companySubOptions ?? [];
        const availableSubs = option.sub_options ?? [];
        return (
          <SubOptionsDialog
            companyId={companyId}
            option={option}
            companySubOptions={companySubs}
            availableSubOptions={availableSubs}
            onUpdate={onSubOptionsChange}
          />
        );
      },
    },
    {
      id: "event",
      header: "Events",
      cell: ({ row }) => {
        const option = row.original;
        
        // Helper to extract event name from various formats
        const getEventName = (eventOrJunction: unknown): string | null => {
          if (!eventOrJunction || typeof eventOrJunction !== 'object') return null;
          
          // Check if it's a junction table entry - try multiple possible field names
          const possibleJunctionFields = ['career_event_id', 'career_event', 'event_id', 'event'];
          for (const fieldName of possibleJunctionFields) {
            if (fieldName in eventOrJunction) {
              const junction = eventOrJunction as Record<string, CareerEvent | string | null>;
              const eventRef = junction[fieldName];
              if (eventRef && typeof eventRef === 'object' && 'name' in eventRef) {
                return String(eventRef.name);
              }
            }
          }
          
          // Direct event object
          if ('name' in eventOrJunction) {
            return String(eventOrJunction.name);
          }
          
          return null;
        };
        
        // Handle multiple events
        if (option.events && Array.isArray(option.events) && option.events.length > 0) {
          const eventNames = option.events
            .map(getEventName)
            .filter((name): name is string => name !== null);
          
          if (eventNames.length > 0) {
            return (
              <div className="font-medium">
                {eventNames.length === 1 
                  ? eventNames[0]
                  : `${eventNames.length} events: ${eventNames.join(', ')}`
                }
              </div>
            );
          }
        }
        
        // Fallback: try to handle single event (for backward compatibility)
        if (option.event) {
          const eventName = getEventName(option.event);
          if (eventName) {
            return <div className="font-medium">{eventName}</div>;
          }
        }
        
        return <div className="font-medium">—</div>;
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const option = row.original;
        return (
          <RemoveOptionDialog
            option={option}
            companyId={companyId}
            onRemove={() => onRemoveOption(option.id)}
          />
        );
      },
    },
  ];
}

/** ------------------------------------------------------------------
 * Remove Option Dialog (confirmation popup)
 * ------------------------------------------------------------------ */
function RemoveOptionDialog({ option, companyId, onRemove }: { option: CareerEventOption; companyId: string; onRemove: () => void }) {
  const [open, setOpen] = React.useState(false);

  const handleRemove = () => {
    removeOptionFromCompanyAction(companyId, option.id)
      .then(() => {
        onRemove();
        setOpen(false);
      })
      .catch((error) => {
        console.error("Error removing option from company:", error);
      });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10">
          <X className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Option</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove &quot;{option.name}&quot; from this company? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">Cancel</Button>
          <Button variant="destructive" onClick={handleRemove} className="w-full sm:w-auto">Remove</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** ------------------------------------------------------------------
 * Remove User Dialog (confirmation popup)
 * ------------------------------------------------------------------ */
function RemoveUserDialog({ user, companyId, onRemove }: { user: Partial<CompanyRep>; companyId: string; onRemove: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleRemove = () => {
    if (!user?.id) return;

    setError(null);

    removeUserFromCompanyAction(companyId, user.id)
      .then((result) => {
        if (result?.success) {
          onRemove();
          setOpen(false);
        } else {
          setError(result?.error || "Failed to remove user");
        }
      })
      .catch((error: unknown) => {
        console.error("Error removing user from company:", error);
        setError("An unexpected error occurred");
      });
  };

  const userName = user?.first_name || user?.last_name
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
    : user?.email || "this user";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        setError(null);
      }
    }}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setOpen(true); }} className="text-destructive">
          Remove
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove User</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove {userName} from this company? The account will be archived and its uploaded files reassigned where possible.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {error}
          </div>
        )}
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => {
            setOpen(false);
            setError(null);
          }} className="w-full sm:w-auto">Cancel</Button>
          <Button variant="destructive" onClick={handleRemove} className="w-full sm:w-auto">Remove</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** ------------------------------------------------------------------
 * OptionFormDialog (returns CareerEventOption)
 * ------------------------------------------------------------------ */
function OptionFormDialog({ company, onCreate }: {
  company: CompanyRow;
  onCreate: (newOption: CareerEventOption) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [selectedOptionId, setSelectedOptionId] = React.useState<string>("");
  const [selectedSubOptionIds, setSelectedSubOptionIds] = React.useState<Set<string>>(new Set());
  const [allOptions, setAllOptions] = React.useState<CareerEventOption[]>([]);
  const [allSubOptions, setAllSubOptions] = React.useState<CareerSubOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showDropdown, setShowDropdown] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Fetch all options directly from career_event_option collection
  // This handles many-to-many relationships correctly in Directus
  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    
    // Import the option repository function
    import("@/lib/repos/option")
      .then(({ listCareerEventOptions }) => listCareerEventOptions({ limit: 1000 }))
      .then((options) => {
        if (!alive) return;
        
        if (!options || options.length === 0) {
          console.warn("No options found. Trying alternative method through events...");
          // Fallback: try fetching through events
          return fetchEventsAction().then((events) => {
            if (!alive) return null;
            const optionsMap = new Map<string, CareerEventOption>();
            
            (events ?? []).forEach((event: CareerEvent) => {
              // Handle junction table structure: options might be an array of junction objects
              let eventOptions: CareerEventOption[] = [];
              
              if (event.options && Array.isArray(event.options)) {
                eventOptions = event.options.map((opt: unknown) => {
                  // Check if it's a junction table entry
                  if (opt && typeof opt === 'object' && 'career_event_option_id' in opt) {
                    const junction = opt as { career_event_option_id: CareerEventOption | null };
                    return junction.career_event_option_id;
                  }
                  // Direct option
                  return opt as CareerEventOption;
                }).filter((opt): opt is CareerEventOption => opt !== null && opt !== undefined && opt.id !== undefined);
              }
              
              eventOptions.forEach((option) => {
                const optionId = option.id;
                if (!optionId) return;
                
                if (optionsMap.has(optionId)) {
                  // Option exists, add event to its events array
                  const existingOption = optionsMap.get(optionId)!;
                  if (!existingOption.events) {
                    existingOption.events = [];
                  }
                  // Check if event already in array
                  const hasEvent = existingOption.events.some(e => e.id === event.id);
                  if (!hasEvent) {
                    existingOption.events.push(event);
                  }
                } else {
                  // New option
                  const newOption: CareerEventOption = {
                    id: option.id,
                    name: option.name,
                    description: option.description,
                    price: option.price,
                    events: [event],
                  };
                  optionsMap.set(optionId, newOption);
                }
              });
            });
            
            return Array.from(optionsMap.values());
          });
        }
        
        // Normalize options: ensure events array and sub_options are properly structured
        // In Directus many-to-many, events come as array of junction table entries
        return options.map((option: any) => {
          const normalized: CareerEventOption = {
            id: option.id,
            name: option.name,
            description: option.description,
            price: option.price,
            events: [],
            sub_options: option.sub_options ?? undefined,
          };
          
          // Handle events - could be in junction table format or direct
          if (option.events && Array.isArray(option.events) && option.events.length > 0) {
            // Events might be in junction table format
            normalized.events = option.events
              .map((eventOrJunction: unknown) => {
                if (!eventOrJunction || typeof eventOrJunction !== 'object') {
                  return null;
                }
                
                // Check if it's a junction table entry with career_event_id field
                if ('career_event_id' in eventOrJunction) {
                  const junction = eventOrJunction as { career_event_id: CareerEvent | string | null };
                  if (junction.career_event_id) {
                    // If it's already an object (populated), return it
                    if (typeof junction.career_event_id === 'object' && junction.career_event_id !== null) {
                      return junction.career_event_id as CareerEvent;
                    }
                    // If it's just an ID string, we can't use it here (would need to fetch)
                    return null;
                  }
                }
                
                // Check if it's a direct event object
                if ('id' in eventOrJunction && 'name' in eventOrJunction) {
                  return eventOrJunction as CareerEvent;
                }
                
                return null;
              })
              .filter((e: CareerEvent | null | undefined): e is CareerEvent => e !== null && e !== undefined);
          } else if (option.event) {
            // Fallback: single event (backward compatibility)
            if (typeof option.event === 'object' && option.event !== null) {
              normalized.events = [option.event as CareerEvent];
            }
          }
          
          return normalized;
        }).filter((opt): opt is CareerEventOption => opt !== null && opt.id !== undefined);
      })
      .then((options) => {
        if (!alive) return;
        if (options) {
          setAllOptions(options);
          if (options.length === 0) {
            console.warn("No options found after normalization");
          } else {
            console.log(`Loaded ${options.length} options`);
            // Log first option structure for debugging
            if (options[0]) {
              console.log("Sample option structure:", {
                id: options[0].id,
                name: options[0].name,
                hasEvents: !!options[0].events,
                eventsCount: options[0].events?.length || 0,
                eventsStructure: options[0].events?.[0] ? Object.keys(options[0].events[0]) : null,
              });
            }
          }
        } else {
          setAllOptions([]);
        }
      })
      .catch((error) => {
        console.error("Error fetching options:", error);
        setAllOptions([]);
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });
    
    return () => { alive = false; };
  }, []);

  // Filter out options that the company already has
  const availableOptions = React.useMemo(() => {
    const companyOptionIds = new Set((company.options ?? []).map(opt => opt?.id).filter((id): id is string => !!id));
    const filtered = allOptions.filter(opt => opt?.id && !companyOptionIds.has(opt.id));
    return filtered;
  }, [allOptions, company.options]);

  // Filter options based on search query
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return availableOptions.slice(0, 50); // Show first 50 when no search
    const query = searchQuery.toLowerCase();
    return availableOptions.filter(opt => {
      const priceStr = typeof opt.price === 'string' ? opt.price : String(opt.price ?? '');
      
      // Check option name
      if (opt.name.toLowerCase().includes(query)) return true;
      
      // Check description
      if (opt.description && stripHtml(opt.description).toLowerCase().includes(query)) return true;
      
      // Check price
      if (priceStr.toLowerCase().includes(query)) return true;
      
      // Check events (multiple events)
      if (opt.events && Array.isArray(opt.events)) {
        const eventNames = opt.events
          .map(event => {
            if (typeof event === 'object' && event !== null && 'name' in event) {
              return String(event.name).toLowerCase();
            }
            return null;
          })
          .filter((name): name is string => name !== null);
        if (eventNames.some(name => name.includes(query))) return true;
      }
      // Fallback: check single event (backward compatibility)
      else if (opt.event) {
        if (typeof opt.event === 'object' && 'name' in opt.event) {
          if (String(opt.event.name).toLowerCase().includes(query)) return true;
        }
      }
      
      return false;
    });
  }, [availableOptions, searchQuery]);

  // Handle click outside to close dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDropdown]);

  const handleOptionSelect = (option: CareerEventOption) => {
    setSelectedOptionId(option.id);
    const priceStr = typeof option.price === 'string' ? option.price : String(option.price ?? '');
    // Handle multiple events
    let eventDisplay = '';
    if (option.events && Array.isArray(option.events) && option.events.length > 0) {
      const eventNames = option.events
        .map(event => {
          if (typeof event === 'object' && event !== null && 'name' in event) {
            return String(event.name);
          }
          return null;
        })
        .filter((name): name is string => name !== null);
      eventDisplay = eventNames.length > 0 
        ? (eventNames.length === 1 ? eventNames[0] : `${eventNames.length} events`)
        : '';
    } else if (option.event) {
      // Fallback for backward compatibility
      if (typeof option.event === 'object' && 'name' in option.event) {
        eventDisplay = String(option.event.name);
      }
    }
    setSearchQuery(eventDisplay ? `${option.name} - ${eventDisplay} (${priceStr})` : `${option.name} (${priceStr})`);
    setShowDropdown(false);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedOptionId) return;

    const selectedOption = allOptions.find(opt => opt.id === selectedOptionId);
    if (!selectedOption) return;

    // Include default sub-options (automatic) + extra sub-options (user-selected)
    const defaultIds = defaultSubOptionsForSelectedOption.map((s) => s.id);
    const extraIds = Array.from(selectedSubOptionIds);
    const subOptionIds = [...defaultIds, ...extraIds];
    const subOptionIdsToPass = subOptionIds.length > 0 ? subOptionIds : undefined;

    // Call server action to add option to company (with suboptions: default + extra)
    addOptionToCompanyAction(company.id, selectedOptionId, subOptionIdsToPass)
      .then(() => {
        onCreate(selectedOption);
        setOpen(false);
        setSelectedOptionId("");
        setSelectedSubOptionIds(new Set());
        setSearchQuery("");
        (e.target as HTMLFormElement).reset();
      })
      .catch((error) => {
        console.error("Error adding option to company:", error);
      });
  };

  const toggleSubOption = (subOptionId: string) => {
    setSelectedSubOptionIds((prev) => {
      const next = new Set(prev);
      if (next.has(subOptionId)) next.delete(subOptionId);
      else next.add(subOptionId);
      return next;
    });
  };

  // Fetch all sub-options when dialog opens
  React.useEffect(() => {
    if (open) {
      import("@/lib/repos/option")
        .then(({ listCareerSubOptions }) => listCareerSubOptions({ limit: 200 }))
        .then((opts) => setAllSubOptions(opts ?? []))
        .catch((err) => {
          console.error("Error loading sub-options:", err);
          setAllSubOptions([]);
        });
    }
  }, [open]);

  // Reset suboptions when option changes
  React.useEffect(() => {
    setSelectedSubOptionIds(new Set());
  }, [selectedOptionId]);

  // Default sub-options (come automatically with the option - no need to ask)
  const defaultSubOptionsForSelectedOption = React.useMemo(() => {
    if (!selectedOptionId) return [];
    const selectedOption = allOptions.find((o) => o.id === selectedOptionId);
    const fromOption = (selectedOption as { sub_options?: unknown[]; career_sub_option?: unknown[] })?.sub_options
      ?? (selectedOption as { sub_options?: unknown[]; career_sub_option?: unknown[] })?.career_sub_option;
    if (!fromOption || !Array.isArray(fromOption) || fromOption.length === 0) return [];
    const resolved: CareerSubOption[] = [];
    for (const s of fromOption) {
      if (typeof s === "string") {
        const match = allSubOptions.find((a) => a.id === s) ?? { id: s, name: s, description: "", price: "", active: true };
        resolved.push(match);
      } else if (typeof s === "object" && s && "id" in s && "name" in s) {
        resolved.push(s as CareerSubOption);
      } else if (typeof s === "object" && s && "career_sub_option_id" in s) {
        const ref = (s as { career_sub_option_id: CareerSubOption | string | null }).career_sub_option_id;
        if (ref && typeof ref === "object" && "id" in ref) resolved.push(ref as CareerSubOption);
        else if (typeof ref === "string") {
          const match = allSubOptions.find((a) => a.id === ref) ?? { id: ref, name: ref, description: "", price: "", active: true };
          resolved.push(match);
        }
      }
    }
    return resolved;
  }, [selectedOptionId, allOptions, allSubOptions]);

  // Extra sub-options (optional add-ons, not included with the option - show selector for these)
  const extraSubOptionsForSelectedOption = React.useMemo(() => {
    if (!selectedOptionId) return [];
    const defaultIds = new Set(defaultSubOptionsForSelectedOption.map((s) => s.id));
    return allSubOptions.filter((s) => !defaultIds.has(s.id));
  }, [selectedOptionId, defaultSubOptionsForSelectedOption, allSubOptions]);

  // Reset search when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedOptionId("");
      setSelectedSubOptionIds(new Set());
      setShowDropdown(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><IconPlus /> Add Option</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add Option to Company</DialogTitle>
            <DialogDescription>Select an option to add to {company.name}.</DialogDescription>
          </DialogHeader>

          <div className="w-full">
            <Label htmlFor="option" className="text-xs">Option*</Label>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading options...</div>
            ) : allOptions.length === 0 ? (
              <div className="text-sm text-muted-foreground">No options found. Please check that events have options configured.</div>
            ) : availableOptions.length === 0 ? (
              <div className="text-sm text-muted-foreground">No available options. All options are already assigned to this company.</div>
            ) : (
              <div className="relative w-full">
                <Input
                  ref={inputRef}
                  id="option"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                    if (!e.target.value) {
                      setSelectedOptionId("");
                    }
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search and select an option..."
                  className="w-full"
                  required={!!selectedOptionId}
                />
                {showDropdown && (filteredOptions.length > 0 || !searchQuery) && (
                  <div
                    ref={dropdownRef}
                    className="absolute z-50 w-full mt-1 max-h-[300px] overflow-y-auto rounded-md border bg-popover shadow-md"
                    style={{ maxWidth: '100%' }}
                  >
                    {filteredOptions.length > 0 ? (
                      filteredOptions.map((option) => {
                        const priceStr = typeof option.price === 'string' ? option.price : String(option.price ?? '');
                        return (
                          <div
                            key={option.id}
                            className="px-3 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm border-b last:border-b-0"
                            onClick={() => handleOptionSelect(option)}
                          >
                            <div className="font-medium truncate">{option.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {(() => {
                                // Handle multiple events
                                if (option.events && Array.isArray(option.events) && option.events.length > 0) {
                                  const eventNames = option.events
                                    .map(event => {
                                      if (typeof event === 'object' && event !== null && 'name' in event) {
                                        return String(event.name);
                                      }
                                      return null;
                                    })
                                    .filter((name): name is string => name !== null);
                                  if (eventNames.length > 0) {
                                    return eventNames.length === 1 
                                      ? `${eventNames[0]} - ${priceStr}`
                                      : `${eventNames.length} events - ${priceStr}`;
                                  }
                                }
                                // Fallback for backward compatibility
                                if (option.event) {
                                  if (typeof option.event === 'object' && 'name' in option.event) {
                                    return `${String(option.event.name)} - ${priceStr}`;
                                  }
                                }
                                return priceStr;
                              })()}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Type to search options...
                      </div>
                    )}
                  </div>
                )}
                {showDropdown && searchQuery && filteredOptions.length === 0 && (
                  <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md p-3 text-sm text-muted-foreground">
                    No options found matching &quot;{searchQuery}&quot;
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedOptionId && defaultSubOptionsForSelectedOption.length > 0 && (
            <div className="w-full space-y-1">
              <Label className="text-xs">Included with this option</Label>
              <p className="text-xs text-muted-foreground">
                {defaultSubOptionsForSelectedOption.map((s) => s.name).join(", ")}
              </p>
            </div>
          )}

          {selectedOptionId && extraSubOptionsForSelectedOption.length > 0 && (
            <div className="w-full space-y-2">
              <Label className="text-xs">Extra sub-options (optional)</Label>
              <p className="text-xs text-muted-foreground">
                Select additional sub-options to add with this option.
              </p>
              <div className="flex flex-wrap gap-3 rounded-md border p-3">
                {extraSubOptionsForSelectedOption.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`subopt-${sub.id}`}
                      checked={selectedSubOptionIds.has(sub.id)}
                      onCheckedChange={() => toggleSubOption(sub.id)}
                    />
                    <Label htmlFor={`subopt-${sub.id}`} className="font-normal text-sm cursor-pointer">
                      {sub.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="submit" disabled={!selectedOptionId || loading || availableOptions.length === 0} className="w-full sm:w-auto">Add</Button>
            <DialogClose asChild>
              <Button variant="outline" onClick={() => { setSearchQuery(""); setSelectedOptionId(""); }} className="w-full sm:w-auto">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Add Company Dialog (controlled) -- unchanged aside from typing */
function CompanyFormDialog({ onRefresh }: { onRefresh?: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [csvUploadOpen, setCsvUploadOpen] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [uploadResult, setUploadResult] = React.useState<{
    success: boolean;
    created: number;
    skipped: number;
    errors: string[];
    skippedCompanies?: string[];
    createdCompanies?: string[];
    message?: string;
    error?: string;
  } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  // Because shadcn Select is not a native select, keep a local state so it lands in FormData-equivalent
  const [salesperson, setSalesperson] = React.useState<string>("");
  const [salespersons, setSalespersons] = React.useState<AppUser[]>([]);
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchSalespersons() {
      const users = await fetchSalespersonsAction();
      if (users) setSalespersons(users);
    }
    fetchSalespersons();
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    const companyName = String(fd.get("companyName") ?? "").trim();
    const vat = String(fd.get("vatNumber") ?? "").trim();
    const firstName = String(fd.get("firstName") ?? "").trim();
    const lastName = String(fd.get("lastName") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const street = String(fd.get("street") ?? "").trim();
    const number = String(fd.get("number") ?? "").trim();
    const zip = String(fd.get("zip") ?? "").trim();
    const city = String(fd.get("city") ?? "").trim();
    const country = String(fd.get("country") ?? "").trim() || "BE";

    const addr = [street && `${street} ${number}`.trim(), zip && `${zip} ${city}`.trim(), country]
      .filter(Boolean)
      .join(", ");

    if (!salesperson) {
      setCreateError("Please select a salesperson.");
      return;
    }

    const newCompany: Partial<Company> = {
      name: companyName,
      salesperson: salesperson,
      VAT: vat,
      address_street: street,
      address_number: number,
      address_zip: zip,
      address_city: city,
      address_country: country,
    }

    // Only create rep if at least email is provided
    let newRep: Partial<CompanyRep> | undefined = undefined;
    if (firstName || lastName || email) {
      newRep = {
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        email: email || undefined,
        role: "d5475bf4-a77f-48de-b06c-fac199b0f631",
        status: "invited"
      };
    }

    setCreating(true);
    setCreateError(null);
    try {
      await createCompanyAction(newCompany, newRep);
      // Reload from the server so the persisted row (with its real id) shows up.
      onRefresh?.();
      setOpen(false);
      formEl.reset();
      setSalesperson("");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create company");
    } finally {
      setCreating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const result = await processCompaniesCSVAction(formData);
      setUploadResult(result);
      
      // Refresh the companies list if any companies were created
      if (result.success && result.created > 0 && onRefresh) {
        onRefresh();
      }
    } catch (error) {
      setUploadResult({
        success: false,
        created: 0,
        skipped: 0,
        errors: [],
        skippedCompanies: [],
        createdCompanies: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="ml-auto" variant="outline">
            <IconPlus /> Add Company
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90dvh] overflow-y-auto" showCloseButton={false}>
          <div className="absolute top-4 right-4 flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCsvUploadOpen(true)}
              className="h-8 w-8 p-0"
              title="Upload CSV/Excel"
            >
              <Upload size={16} />
            </Button>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <X size={16} />
              </Button>
            </DialogClose>
          </div>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Add a New Company</DialogTitle>
              <DialogDescription>Fill in the company details below.</DialogDescription>
            </DialogHeader>

          {/* Company name */}
          <div className="w-full">
            <Label htmlFor="companyName" className="text-xs">
              Company name*
            </Label>
            <div className="relative">
              <Input name="companyName" id="companyName" placeholder="VTK" className="pl-10" required />
              <IconBuilding className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            </div>
          </div>

          <div className="w-full">
            <Label htmlFor="salesperson" className="text-xs">
              Salesperson*
            </Label>
            <Select value={salesperson} onValueChange={setSalesperson}>
              <SelectTrigger id="salesperson" className="w-full">
                <SelectValue placeholder="Select a salesperson" />
              </SelectTrigger>
              <SelectContent>
                {salespersons.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Account Owner */}
          <div className="p-4 border rounded-md space-y-4 bg-slate-50">
            <div>
              <span>Account Owner</span>
            </div>
            <div className="w-full flex gap-4">
              <div>
                <Label htmlFor="firstName" className="text-xs">
                  First Name
                </Label>
                <Input name="firstName" id="firstName" placeholder="Wannes" />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-xs">
                  Last Name
                </Label>
                <Input name="lastName" id="lastName" placeholder="Huygh" />
              </div>
            </div>
            <div className="w-full">
              <Label htmlFor="email" className="text-xs">
                Email
              </Label>
              <div className="relative">
                <Input name="email" id="email" type="email" placeholder="wannes.huygh@vtk.be" className="pl-10" />
                <IconMail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              </div>
            </div>
          </div>

          {/* Additional Fields */}
          <div className="p-4 border rounded-md space-y-4 bg-slate-50">
            <div>
              <span>Additional Fields</span>
              <br />
              <span className="text-muted-foreground text-sm">
                Note that these fields will also be presented to the user upon onboarding.
              </span>
            </div>

            <div className="w-full">
              <Label htmlFor="vatNumber" className="text-xs">
                VAT-Number
              </Label>
              <div className="relative">
                <Input name="vatNumber" id="vatNumber" placeholder="BE0479.482.282" className="pl-10" />
                <IconTaxEuro className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              </div>
            </div>

            <div className="w-full flex gap-4">
              <div className="flex-3/4">
                <Label htmlFor="street" className="text-xs">
                  Street
                </Label>
                <Input name="street" id="street" placeholder="Studentenwijk Arenberg" />
              </div>
              <div className="flex-1/4">
                <Label htmlFor="number" className="text-xs">
                  Number
                </Label>
                <Input name="number" id="number" placeholder="6/1" />
              </div>
            </div>

            <div className="w-full flex gap-4">
              <div className="flex-2/5">
                <Label htmlFor="zip" className="text-xs">
                  ZIP
                </Label>
                <Input name="zip" id="zip" placeholder="3001" />
              </div>
              <div className="flex-2/5">
                <Label htmlFor="city" className="text-xs">
                  City
                </Label>
                <Input name="city" id="city" placeholder="Leuven" />
              </div>
              <div className="flex-1/5">
                <Label htmlFor="country" className="text-xs">
                  Country
                </Label>
                <Select name="country" defaultValue="BE">
                  <SelectTrigger id="country">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BE">Belgium</SelectItem>
                    <SelectItem value="NL">Netherlands</SelectItem>
                    <SelectItem value="DE">Germany</SelectItem>
                    <SelectItem value="LU">Luxembourg</SelectItem>
                    <SelectItem value="FR">France</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <div className="flex flex-col gap-4 w-full">
              <DialogDescription>
                By clicking &quot;Save&quot; an onboarding email will be sent to the &quot;Account Owner&quot;.
              </DialogDescription>
              {createError ? <p className="text-sm text-destructive">{createError}</p> : null}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="submit" disabled={!salesperson || creating} className="w-full sm:w-auto">
                  {creating ? "Saving..." : "Save"}
                </Button>
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="w-full sm:w-auto">
                    Cancel
                  </Button>
                </DialogClose>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* CSV Upload Dialog */}
    <Dialog open={csvUploadOpen} onOpenChange={setCsvUploadOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload Companies (CSV)</DialogTitle>
          <DialogDescription>
            Upload a CSV file with company data. Column names should match the form field names.
            Required columns: companyName, salesperson (salesperson name, e.g., "John Doe").
            Optional columns: vatNumber, firstName, lastName, email, street, number, zip, city, country.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          <div>
            <Label htmlFor="csvFile" className="text-sm font-medium">
              Select File
            </Label>
            <Input
              id="csvFile"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              ref={fileInputRef}
              disabled={uploading}
              className="mt-2"
            />
          </div>

          {uploading && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              Processing file... This may take a while for large files.
            </div>
          )}

          {uploadResult && (
            <div className="flex-1 overflow-y-auto space-y-4">
              <div className={`p-4 rounded-md ${uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                {uploadResult.success ? (
                  <div className="space-y-3">
                    <div className="font-medium text-lg text-green-800">
                      {uploadResult.message}
                    </div>
                    
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="bg-white p-3 rounded border">
                        <div className="font-semibold text-green-700">Created</div>
                        <div className="text-2xl font-bold text-green-800">{uploadResult.created}</div>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <div className="font-semibold text-yellow-700">Skipped</div>
                        <div className="text-2xl font-bold text-yellow-800">{uploadResult.skipped}</div>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <div className="font-semibold text-red-700">Errors</div>
                        <div className="text-2xl font-bold text-red-800">{uploadResult.errors.length}</div>
                      </div>
                    </div>

                    {/* Created Companies */}
                    {uploadResult.createdCompanies && uploadResult.createdCompanies.length > 0 && (
                      <div className="bg-white p-3 rounded border">
                        <div className="font-semibold text-green-700 mb-2">
                          Created Companies ({uploadResult.createdCompanies.length}):
                        </div>
                        <div className="max-h-32 overflow-y-auto text-sm">
                          <ul className="list-disc list-inside space-y-1">
                            {uploadResult.createdCompanies.map((name, idx) => (
                              <li key={idx} className="text-green-800">{name}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Skipped Companies */}
                    {uploadResult.skippedCompanies && uploadResult.skippedCompanies.length > 0 && (
                      <div className="bg-white p-3 rounded border">
                        <div className="font-semibold text-yellow-700 mb-2">
                          Skipped Companies ({uploadResult.skippedCompanies.length}):
                        </div>
                        <div className="max-h-32 overflow-y-auto text-sm">
                          <ul className="list-disc list-inside space-y-1">
                            {uploadResult.skippedCompanies.map((name, idx) => (
                              <li key={idx} className="text-yellow-800">{name}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Errors */}
                    {uploadResult.errors.length > 0 && (
                      <div className="bg-white p-3 rounded border">
                        <div className="font-semibold text-red-700 mb-2">
                          Errors ({uploadResult.errors.length}):
                        </div>
                        <div className="max-h-48 overflow-y-auto text-sm">
                          <ul className="list-disc list-inside space-y-1">
                            {uploadResult.errors.map((error, idx) => (
                              <li key={idx} className="text-red-800">{error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-red-800">
                    <div className="font-medium text-lg">Error:</div>
                    <div className="text-sm mt-1">{uploadResult.error}</div>
                    {uploadResult.errors.length > 0 && (
                      <div className="mt-3">
                        <div className="font-semibold mb-2">Details:</div>
                        <div className="max-h-48 overflow-y-auto text-sm">
                          <ul className="list-disc list-inside space-y-1">
                            {uploadResult.errors.map((error, idx) => (
                              <li key={idx}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button 
              type="button" 
              variant="outline" 
              disabled={uploading}
              onClick={() => {
                setUploadResult(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            >
              {uploadResult ? 'Close' : 'Cancel'}
            </Button>
          </DialogClose>
          {uploadResult && uploadResult.success && (
            <Button
              type="button"
              onClick={() => {
                setCsvUploadOpen(false);
                setOpen(false);
                setUploadResult(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            >
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

/** Edit an existing company's core fields (name, VAT, status, salesperson). */
function EditCompanyDialog({ company, onClose, onSaved }: {
  company: CompanyRow | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [salespersons, setSalespersons] = React.useState<AppUser[]>([]);
  const [form, setForm] = React.useState({ name: "", VAT: "", status: "draft", salesperson: "" });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchSalespersonsAction().then((users) => { if (users) setSalespersons(users); }).catch(() => {});
  }, []);

  React.useEffect(() => {
    if (!company) return;
    const sp = company.salesperson as unknown;
    const salespersonId =
      sp && typeof sp === "object" && "id" in sp ? String((sp as { id: string }).id) : (typeof sp === "string" ? sp : "");
    setForm({
      name: company.name ?? "",
      VAT: company.VAT ?? "",
      status: company.status || "draft",
      salesperson: salespersonId,
    });
    setError(null);
  }, [company]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setSaving(true);
    setError(null);
    try {
      await updateCompanyAction(company.id, {
        name: form.name,
        VAT: form.VAT,
        status: form.status,
        ...(form.salesperson ? { salesperson: form.salesperson } : {}),
      } as Partial<Company>);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update company");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!company} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Company</DialogTitle>
          <DialogDescription>Update the company details below.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-name">Company name*</Label>
            <Input id="edit-name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-vat">VAT</Label>
            <Input id="edit-vat" value={form.VAT} onChange={(e) => setForm((p) => ({ ...p, VAT: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-status">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
              <SelectTrigger id="edit-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-salesperson">Salesperson</Label>
            <Select value={form.salesperson} onValueChange={(v) => setForm((p) => ({ ...p, salesperson: v }))}>
              <SelectTrigger id="edit-salesperson" className="w-full"><SelectValue placeholder="Select a salesperson" /></SelectTrigger>
              <SelectContent>
                {salespersons.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** ------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------ */
function formatAddress(r: Company) {
  const parts = [
    r.address_street && `${r.address_street} ${r.address_number ?? ""}`.trim(),
    r.address_zip && `${r.address_zip} ${r.address_city ?? ""}`.trim(),
    r.address_country,
  ].filter(Boolean);
  return parts.join(", ");
}

/** ------------------------------------------------------------------
/** ------------------------------------------------------------------
 * Events section
 * ------------------------------------------------------------------ */
export function EventsSection({ academicYearId }: { academicYearId?: string }) {
  const [events, setEvents] = React.useState<CareerEvent[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(() => {
    return fetchEventsAction(academicYearId ? { academicYearId } : undefined)
      .then(rows => { setEvents(rows ?? []); })
      .catch(console.error);
  }, [academicYearId]);

  React.useEffect(() => {
    let alive = true;
    fetchEventsAction(academicYearId ? { academicYearId } : undefined)
      .then(rows => { if (!alive) return; setEvents(rows ?? []); })
      .catch(console.error)
      .finally(() => setLoading(false));
    return () => { alive = false; };
  }, [academicYearId]);

  return (
    <Card className="rounded-2xl shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-2xl">Annual event editions</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Dates and operational settings for the selected academic year.
          </p>
        </div>
        <EventFormDialog onSaved={refresh} defaultAcademicYearId={academicYearId} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-24 grid place-items-center text-sm text-muted-foreground">Loading events…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
            {events.map(e => <EventCard key={e.id ?? e.name} event={e} onChanged={refresh} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Create/Edit dialog for a career event. Omitting `event` makes it a create form. */
function EventFormDialog({
  event,
  onSaved,
  defaultAcademicYearId,
}: {
  event?: CareerEvent;
  onSaved?: () => void;
  defaultAcademicYearId?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const isEdit = !!event;

  const [form, setForm] = React.useState({
    name: "",
    description: "",
    location: "",
    date: "",
    start_hour: "",
    end_hour: "",
    shout: "",
    status: "draft",
    num_of_companies: "",
    num_of_students: "",
    image: "" as string | undefined,
    academic_year_id: "",
  });
  const [eventAcademicYears, setEventAcademicYears] = React.useState<Array<{ id: string; name: string; start_of_year: string; end_of_year: string }>>([]);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setSelectedFile(null);
    setForm({
      name: event?.name ?? "",
      description: (event?.description as string) ?? "",
      location: (event?.location as string) ?? "",
      date: event?.date ? String(event.date).slice(0, 10) : "",
      start_hour: event?.start_hour ? String(event.start_hour).slice(0, 5) : "",
      end_hour: event?.end_hour ? String(event.end_hour).slice(0, 5) : "",
      shout: (event?.shout as string) ?? "",
      status: (event?.status as string) ?? "draft",
      num_of_companies: event?.num_of_companies != null ? String(event.num_of_companies) : "",
      num_of_students: event?.num_of_students != null ? String(event.num_of_students) : "",
      image: (event?.image as string) ?? "",
      academic_year_id: String(event?.academic_year_id ?? event?.academic_year?.id ?? defaultAcademicYearId ?? ""),
    });
    fetchAcademicYearsAction().then((years) => {
      const available = years ?? [];
      setEventAcademicYears(available);
      setForm((current) => {
        if (current.academic_year_id) return current;
        const now = Date.now();
        const active = available.find((year) =>
          new Date(year.start_of_year).getTime() <= now && new Date(year.end_of_year).getTime() >= now
        ) ?? available[0];
        return { ...current, academic_year_id: active ? String(active.id) : "" };
      });
    });
  }, [open, event, defaultAcademicYearId]);

  const set = (key: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let imageId = form.image;
      if (selectedFile) {
        const fd = new FormData();
        fd.append("file", selectedFile);
        const res = await uploadFileAction(fd);
        if (!res.success || !res.data) {
          setError("Failed to upload image: " + (res.error ?? "unknown error"));
          setSaving(false);
          return;
        }
        imageId = res.data.id;
      }

      const payload = {
        name: form.name,
        description: form.description,
        location: form.location || null,
        date: form.date || null,
        start_hour: form.start_hour || null,
        end_hour: form.end_hour || null,
        shout: form.shout || null,
        status: form.status,
        num_of_companies: form.num_of_companies,
        num_of_students: form.num_of_students,
        image: imageId || null,
        academic_year_id: form.academic_year_id,
      };

      const result = isEdit
        ? await updateEventAction(event!.id, payload)
        : await createEventAction(payload);
      if (!result.success) {
        setError(result.error ?? "Something went wrong");
        setSaving(false);
        return;
      }
      setOpen(false);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="outline" size="sm">Edit</Button>
        ) : (
          <Button size="sm"><IconPlus className="mr-1 h-4 w-4" /> New event series</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit annual event edition" : "Create a new event series"}</DialogTitle>
          {!isEdit ? (
            <DialogDescription>
              Only use this for a genuinely new recurring event. To create next year’s Jobfair,
              close this dialog and use “Create annual editions” on the Events page. A draft
              public event page is created automatically.
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-name">Name*</Label>
            <Input id="ev-name" value={form.name} onChange={e => set("name", e.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Academic year*</Label>
            <Select value={form.academic_year_id} onValueChange={value => set("academic_year_id", value)} required disabled={isEdit}>
              <SelectTrigger><SelectValue placeholder="Select academic year" /></SelectTrigger>
              <SelectContent>
                {eventAcademicYears.map((year) => (
                  <SelectItem key={year.id} value={String(year.id)}>{year.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-desc">Description</Label>
            <SimpleRichTextEditor
              value={form.description}
              onChange={description => set("description", description)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ev-location">Location</Label>
              <Input id="ev-location" value={form.location} onChange={e => set("location", e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ev-date">Date</Label>
              <Input id="ev-date" type="date" value={form.date} onChange={e => set("date", e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ev-start">Start hour</Label>
              <Input id="ev-start" type="time" value={form.start_hour} onChange={e => set("start_hour", e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ev-end">End hour</Label>
              <Input id="ev-end" type="time" value={form.end_hour} onChange={e => set("end_hour", e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ev-companies"># Companies</Label>
              <Input id="ev-companies" type="number" value={form.num_of_companies} onChange={e => set("num_of_companies", e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ev-students"># Students</Label>
              <Input id="ev-students" type="number" value={form.num_of_students} onChange={e => set("num_of_students", e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-shout">Shout</Label>
            <Input id="ev-shout" value={form.shout} onChange={e => set("shout", e.target.value)} placeholder="Short highlight banner text" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-status">Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger id="ev-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-image">Image</Label>
            <div className="flex items-center gap-3">
              {(selectedFile || form.image) && (
                <div className="h-16 w-16 overflow-hidden rounded border bg-muted shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedFile ? URL.createObjectURL(selectedFile) : `/api/files/${form.image}`}
                    alt="Preview"
                    className="h-full w-full object-cover"
                    onError={e => ((e.target as HTMLImageElement).style.display = "none")}
                  />
                </div>
              )}
              <Input id="ev-image" type="file" accept="image/*" onChange={e => setSelectedFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : isEdit ? "Save changes" : "Create event series"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EventCard({ event, onChanged }: { event: CareerEvent; onChanged?: () => void }) {
  const hours = [event.start_hour, event.end_hour].filter(Boolean).join(" – ");
  const [hasFloorplan, setHasFloorplan] = React.useState<boolean | null>(null);
  const [hasCompanyGuide, setHasCompanyGuide] = React.useState<boolean | null>(null);
  const [hasMatchingSoftware, setHasMatchingSoftware] = React.useState<boolean | null>(null);
  const [hasSchedules, setHasSchedules] = React.useState<boolean | null>(null);
  const [headerButtons, setHeaderButtons] = React.useState<HeaderButtonType[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingHeaderButtons, setSavingHeaderButtons] = React.useState(false);
  const [hasEventPage, setHasEventPage] = React.useState(false);
  const [eventPageStatus, setEventPageStatus] = React.useState<string | null>(null);

  React.useEffect(() => {
    const checkFloorplan = async () => {
      try {
        const { getEventPageWithFloorplan } = await import("@/lib/repos/floorplan");
        const eventPage = await getEventPageWithFloorplan(event.id);
        setHasEventPage(Boolean(eventPage));
        setEventPageStatus(eventPage?.status ?? null);
        setHasFloorplan(!!eventPage?.floorplan);
        // Check if company_guide exists (could be string ID or object with id)
        const companyGuide = eventPage?.company_guide;
        if (companyGuide) {
          const hasGuide = typeof companyGuide === 'string' 
            ? !!companyGuide 
            : !!(companyGuide as { id?: string })?.id;
          setHasCompanyGuide(hasGuide);
        } else {
          setHasCompanyGuide(false);
        }
        // Load header_buttons config
        const buttons = eventPage?.header_buttons;
        setHeaderButtons(Array.isArray(buttons) ? buttons : []);
        // Check if matching software exists for this event
        const matchingList = await listMatchingSoftwareAction({ eventId: event.id });
        setHasMatchingSoftware((matchingList?.length ?? 0) > 0);
        const { hasSchedulesForEvent } = await import("@/lib/repos/schedule");
        setHasSchedules(await hasSchedulesForEvent(event.id));
      } catch (error) {
        console.error("Error checking floorplan:", error);
        setHasFloorplan(false);
        setHasCompanyGuide(false);
        setHasMatchingSoftware(false);
        setHasSchedules(false);
        setHasEventPage(false);
        setEventPageStatus(null);
      } finally {
        setLoading(false);
      }
    };
    checkFloorplan();
  }, [event.id]);

  const toggleHeaderButton = async (btn: HeaderButtonType) => {
    const next = headerButtons.includes(btn)
      ? headerButtons.filter((b) => b !== btn)
      : [...headerButtons, btn];
    setHeaderButtons(next);
    setSavingHeaderButtons(true);
    try {
      const res = await fetch("/api/admin/event-page/header-buttons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, headerButtons: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }
    } catch (err) {
      console.error("Failed to update header buttons:", err);
      setHeaderButtons(headerButtons); // Revert
      alert(err instanceof Error ? err.message : "Failed to save header buttons.");
    } finally {
      setSavingHeaderButtons(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete event "${event.name}"? This cannot be undone.`)) return;
    const res = await deleteEventAction(event.id);
    if (!res.success) {
      alert(res.error ?? "Failed to delete event");
      return;
    }
    onChanged?.();
  };

  return (
    <Card className="border rounded-lg shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>{event.name}</CardTitle>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-muted px-2 py-1">
              {event.academic_year?.name ?? "Annual edition"}
            </span>
            <span className={eventPageStatus === "published" ? "rounded-full bg-emerald-100 px-2 py-1 text-emerald-800" : "rounded-full bg-amber-100 px-2 py-1 text-amber-800"}>
              {hasEventPage ? `Event page: ${eventPageStatus ?? "draft"}` : "Event page missing"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <EventFormDialog event={event} onSaved={onChanged} />
          <Button variant="ghost" size="icon" className="text-destructive" onClick={handleDelete} aria-label="Delete event">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="grid grid-cols-2 gap-1 text-sm text-muted-foreground">
          <span>Date</span>
          <span className="font-medium text-foreground">{String(event.date ?? "TBA")}</span>
          <span>Hours</span>
          <span className="font-medium text-foreground">{hours || "TBA"}</span>
          <span>Location</span>
          <span className="font-medium text-foreground">{String(event.location ?? "TBA")}</span>
          <span># Students</span>
          <span className="font-medium text-foreground">{String(event.num_of_students ?? "–")}</span>
        </div>
        <div className="flex flex-col gap-2 items-stretch">
          <Button variant="default" size="sm" asChild className="w-full">
            <Link href={`/admin/event-pages?year=${event.academic_year_id ?? event.academic_year?.id ?? ""}&event=${event.id}`}>
              {hasEventPage ? "Edit event page & timetable" : "Create event page"}
            </Link>
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/checkins/${event.id}`}>Check-ins</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/speakers">Speakers</Link>
            </Button>
          </div>
          {/* Header buttons: choose which buttons appear on the public event page header. When any are on, main nav (Home, Events, etc.) is hidden. */}
          {!loading && (
            <div className="space-y-2 rounded-md border p-3">
              <Label className="text-xs font-medium">Header buttons</Label>
              <p className="text-xs text-muted-foreground">Show in event page header (replaces main nav when any are on):</p>
              <div className="flex flex-wrap gap-3">
                {hasFloorplan && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={headerButtons.includes("floorplan")}
                      onCheckedChange={() => toggleHeaderButton("floorplan")}
                      disabled={savingHeaderButtons}
                    />
                    <span className="text-sm">Floorplan</span>
                  </label>
                )}
                {hasCompanyGuide && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={headerButtons.includes("company_guide")}
                      onCheckedChange={() => toggleHeaderButton("company_guide")}
                      disabled={savingHeaderButtons}
                    />
                    <span className="text-sm">Company guide</span>
                  </label>
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={headerButtons.includes("cv_upload")}
                    onCheckedChange={() => toggleHeaderButton("cv_upload")}
                    disabled={savingHeaderButtons}
                  />
                  <span className="text-sm">CV Upload</span>
                </label>
                {hasMatchingSoftware && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={headerButtons.includes("matching_software")}
                      onCheckedChange={() => toggleHeaderButton("matching_software")}
                      disabled={savingHeaderButtons}
                    />
                    <span className="text-sm">Matching Software</span>
                  </label>
                )}
              </div>
            </div>
          )}
          <AddCompaniesDialog event={event} />
          <AddCompanyGuideDialog event={event} hasCompanyGuide={hasCompanyGuide} />
          {loading ? (
            <Button variant="outline" size="sm" disabled className="w-full">
              Loading...
            </Button>
          ) : hasFloorplan ? (
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link href={`/admin/floorplan/${event.id}`}>
                Edit floorplan
              </Link>
            </Button>
          ) : (
            <AddFloorplanDialog event={event} />
          )}
          {!loading && (hasMatchingSoftware ? (
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link href={`/admin/matching-software?eventId=${event.id}`}>
                Edit matching software
              </Link>
            </Button>
          ) : (
            <AddMatchingSoftwareDialog event={event} onCreated={() => setHasMatchingSoftware(true)} />
          ))}
          {!loading && (hasSchedules ? (
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link href={`/admin/schedules?eventId=${event.id}`}>
                Edit Schedules
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link href={`/admin/schedules?eventId=${event.id}`}>
                Add Schedules
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AddMatchingSoftwareDialog({ event, onCreated }: { event: CareerEvent; onCreated?: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [academicYears, setAcademicYears] = React.useState<{ id: string; name: string; start_of_year: string; end_of_year: string }[]>([]);
  const [forms, setForms] = React.useState<{ id: string; name: string }[]>([]);
  const [selectedYearId, setSelectedYearId] = React.useState("");
  const [selectedFormId, setSelectedFormId] = React.useState("");

  React.useEffect(() => {
    if (open) {
      Promise.all([fetchAcademicYearsAction(), fetchFormsAction()]).then(([years, formsList]) => {
        setAcademicYears(years || []);
        setForms(formsList || []);
      });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedYearId) {
      setError("Please select an academic year");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await createMatchingSoftwareAction({
        year: selectedYearId,
        event: event.id,
        prerequisite_form: selectedFormId || undefined,
        active: true,
      });
      setOpen(false);
      setSelectedYearId("");
      setSelectedFormId("");
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <IconPlus className="h-4 w-4 mr-2" />
          Add matching software
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add Matching Software</DialogTitle>
            <DialogDescription>
              Set up RIASEC matching for {event.name}. Students fill in 12 questions; optionally require a prerequisite form first.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
          )}
          <div className="space-y-2">
            <Label>Academic Year *</Label>
            <Select value={selectedYearId} onValueChange={setSelectedYearId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.name} ({y.start_of_year} - {y.end_of_year})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Prerequisite Form (optional)</Label>
            <Select value={selectedFormId || "__none__"} onValueChange={(v) => setSelectedFormId(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {forms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Students must complete this form before the matching software. Response is included in the result.
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Creating..." : "Create"}
            </Button>
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto" disabled={loading}>
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddFloorplanDialog({ event }: { event: CareerEvent }) {
  const [open, setOpen] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const year = String(fd.get("year") ?? "").trim();
    const svgFile = fd.get("svg") as File | null;

    if (!name || !year || !svgFile) {
      setError("Please fill in all fields and select an SVG file");
      return;
    }

    if (svgFile.type !== "image/svg+xml" && !svgFile.name.toLowerCase().endsWith(".svg")) {
      setError("Please select an SVG file");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("svg", svgFile);
      formData.append("name", name);
      formData.append("year", year);
      formData.append("eventId", event.id);
      
      // Add background image if provided
      const backgroundInput = (e.target as HTMLFormElement).elements.namedItem("background") as HTMLInputElement;
      if (backgroundInput?.files?.[0]) {
        formData.append("background", backgroundInput.files[0]);
      }

      const response = await fetch("/api/admin/upload-floorplan", {
        method: "POST",
        body: formData,
      });

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to upload floorplan");
      }

      setOpen(false);
      (e.target as HTMLFormElement).reset();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <IconPlus className="h-4 w-4 mr-2" />
          Add floorplan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add Floorplan</DialogTitle>
            <DialogDescription>
              Upload an SVG floorplan for {event.name}. The system will extract booths automatically.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="w-full">
            <Label htmlFor="name" className="text-xs">Floorplan Name*</Label>
            <Input name="name" id="name" placeholder="Main Hall Floorplan" required />
          </div>

          <div className="w-full">
            <Label htmlFor="year" className="text-xs">Year*</Label>
            <Input name="year" id="year" placeholder="2025" required />
          </div>

          <div className="w-full">
            <Label htmlFor="svg" className="text-xs">SVG File*</Label>
            <Input
              ref={fileInputRef}
              name="svg"
              id="svg"
              type="file"
              accept="image/svg+xml,.svg"
              required
              disabled={uploading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Upload an SVG floorplan file. The system will extract booths automatically.
            </p>
          </div>

          <div className="w-full">
            <Label htmlFor="background" className="text-xs">Background Image (Optional)</Label>
            <Input
              name="background"
              id="background"
              type="file"
              accept="image/*"
              disabled={uploading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Upload a background image to display behind the floorplan.
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="submit" disabled={uploading} className="w-full sm:w-auto">
              {uploading ? "Processing..." : "Upload & Process"}
            </Button>
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto" disabled={uploading}>
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddCompaniesDialog({ event }: { event: CareerEvent }) {
  const [open, setOpen] = React.useState(false);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedCompanyIds, setSelectedCompanyIds] = React.useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = React.useState("");
  const [hasExistingCompanies, setHasExistingCompanies] = React.useState(false);

  // Check if event page already has companies
  React.useEffect(() => {
    const checkExistingCompanies = async () => {
      try {
        const { getEventPageWithFloorplan } = await import("@/lib/repos/floorplan");
        const eventPage = await getEventPageWithFloorplan(event.id);
        const companies = eventPage?.companies;
        setHasExistingCompanies(!!companies && Array.isArray(companies) && companies.length > 0);
      } catch (error) {
        console.error("Error checking existing companies:", error);
        setHasExistingCompanies(false);
      }
    };
    checkExistingCompanies();
  }, [event.id]);

  // Load companies when dialog opens
  React.useEffect(() => {
    if (open) {
      setLoading(true);
      setError(null);
      findCompaniesWithEventOptions(event.id)
        .then((companies) => {
          setCompanies(companies);
          // All companies selected by default
          setSelectedCompanyIds(new Set(companies.map((c) => c.id)));
        })
        .catch((err) => {
          console.error("Error loading companies:", err);
          setError("Failed to load companies");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // Reset when dialog closes
      setCompanies([]);
      setSelectedCompanyIds(new Set());
      setSearchQuery("");
      setError(null);
    }
  }, [open, event.id]);

  const toggleCompany = (companyId: string) => {
    setSelectedCompanyIds((prev) => {
      const next = new Set(prev);
      if (next.has(companyId)) {
        next.delete(companyId);
      } else {
        next.add(companyId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedCompanyIds.size === filteredCompanies.length) {
      setSelectedCompanyIds(new Set());
    } else {
      setSelectedCompanyIds(new Set(filteredCompanies.map((c) => c.id)));
    }
  };

  const filteredCompanies = React.useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const query = searchQuery.toLowerCase();
    return companies.filter((c) => c.name.toLowerCase().includes(query));
  }, [companies, searchQuery]);

  const handleAdd = async () => {
    if (selectedCompanyIds.size === 0) {
      setError("Please select at least one company");
      return;
    }

    setAdding(true);
    setError(null);

    try {
      const result = await addCompaniesToEventPageAction(
        event.id,
        Array.from(selectedCompanyIds)
      );

      if (result.success) {
        setOpen(false);
        // Update hasExistingCompanies after successful add
        setHasExistingCompanies(true);
      } else {
        setError(result.error || "Failed to add companies");
      }
    } catch (err) {
      console.error("Error adding companies:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <IconPlus className="h-4 w-4 mr-2" />
          {hasExistingCompanies ? "Edit companies" : "Add companies"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{hasExistingCompanies ? "Edit Companies" : "Add Companies"} to {event.name}</DialogTitle>
          <DialogDescription>
            Select companies that have registered for this event through career event options.
            All companies are selected by default, but you can deselect any before adding.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {error}
          </div>
        )}

        {loading ? (
          <div className="h-32 grid place-items-center text-sm text-muted-foreground">
            Loading companies...
          </div>
        ) : companies.length === 0 ? (
          <div className="h-32 grid place-items-center text-sm text-muted-foreground">
            No companies found with options for this event.
          </div>
        ) : (
          <>
            <div className="w-full">
              <Input
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="border rounded-lg">
              <div className="p-3 border-b flex items-center justify-between bg-muted/50">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={
                      filteredCompanies.length > 0 &&
                      filteredCompanies.every((c) => selectedCompanyIds.has(c.id))
                    }
                    onCheckedChange={toggleAll}
                  />
                  <span className="text-sm font-medium">
                    {selectedCompanyIds.size} of {companies.length} selected
                  </span>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {filteredCompanies.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No companies match your search.
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredCompanies.map((company) => (
                      <div
                        key={company.id}
                        className="p-3 hover:bg-muted/50 flex items-center gap-3 cursor-pointer"
                        onClick={() => toggleCompany(company.id)}
                      >
                        <Checkbox
                          checked={selectedCompanyIds.has(company.id)}
                          onCheckedChange={() => toggleCompany(company.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-sm font-medium flex-1">
                          {company.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            onClick={handleAdd}
            disabled={adding || selectedCompanyIds.size === 0}
            className="w-full sm:w-auto"
          >
            {adding ? "Adding..." : `Add ${selectedCompanyIds.size} companies`}
          </Button>
          <DialogClose asChild>
            <Button variant="outline" className="w-full sm:w-auto" disabled={adding}>
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddCompanyGuideDialog({ event, hasCompanyGuide }: { event: CareerEvent; hasCompanyGuide?: boolean | null }) {
  const [open, setOpen] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    
    const fd = new FormData(e.currentTarget);
    const pdfFile = fd.get("pdf") as File | null;

    if (!pdfFile) {
      setError("Please select a PDF file");
      return;
    }

    if (pdfFile.type !== "application/pdf" && !pdfFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("pdf", pdfFile);
      formData.append("eventId", event.id);

      const response = await fetch("/api/admin/upload-company-guide", {
        method: "POST",
        body: formData,
      });

      // Always try to parse as JSON first
      let result: { success?: boolean; error?: string; message?: string };
      try {
        result = await response.json();
      } catch (jsonError) {
        // If JSON parsing fails, the response is likely an error page
        // Read as text for debugging, but don't try to parse again
        const text = await response.text();
        console.error("Non-JSON response:", text.substring(0, 500)); // Limit log size
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        throw new Error(result.error || "Failed to upload company guide");
      }

      setOpen(false);
      (e.target as HTMLFormElement).reset();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      // Reload the page to show the updated state
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          {hasCompanyGuide ? (
            "Edit Company Guide"
          ) : (
            <>
              <IconPlus className="h-4 w-4 mr-2" />
              Add Company Guide
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add Company Guide</DialogTitle>
            <DialogDescription>
              Upload a PDF company guide for {event.name}. Only one company guide per event page.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="w-full">
            <Label htmlFor="pdf" className="text-xs">PDF File*</Label>
            <Input
              ref={fileInputRef}
              name="pdf"
              id="pdf"
              type="file"
              accept="application/pdf,.pdf"
              required
              disabled={uploading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Upload a PDF file. This will replace any existing company guide for this event.
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="submit" disabled={uploading} className="w-full sm:w-auto">
              {uploading ? "Uploading..." : "Upload"}
            </Button>
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto" disabled={uploading}>
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
