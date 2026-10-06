"use client";

import * as React from "react";
import { fetchCompaniesWithSubOptionsAction, createCompanyAction, updateCompanyAction, createCompanyRepAction, addOptionToCompanyAction, removeOptionFromCompanyAction, addSubOptionToCompanyAction, removeSubOptionFromCompanyAction, addSubOptionToCompanyOnlyAction, removeSubOptionFromCompanyOnlyAction, removeUserFromCompanyAction, processCompaniesCSVAction, resendInviteAction, fetchCompanyOptionsDebugAction } from "@/app/actions/companies";
import { fetchEventsAction } from "@/app/actions/events";
import { listSubOptionsAction, listEventOptionsAction } from "@/app/actions/career-options";
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
import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, MoreHorizontal, Package, Pencil, Search, Upload, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { IconBuilding, IconColumns, IconMail, IconPlus, IconTaxEuro } from "@tabler/icons-react";
import type { AcademicYear, CareerEvent, Company, CompanyRep, CareerEventOption, CareerSubOption } from "@/lib/schema";
import type { UserSummary as AppUser } from "@/lib/schema";
import { slugifyCompanyName } from "@/lib/utils/slugify";
import { toast } from "sonner";

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
type CompaniesData = Awaited<ReturnType<typeof fetchCompaniesWithSubOptionsAction>>;

/** The table's rows: each company with its options' events and sub-options resolved. */
function toCompanyRows({ companies: rows, allSubOptions }: CompaniesData): CompanyRow[] {
  return (rows ?? []).map((r: Company & { status?: string }) => ({
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
    options: (r.options ?? []).map((opt) => {
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
      
      return normalizedOption;
    }).filter((opt): opt is CareerEventOptionWithCompanySubOptions => opt !== null && opt !== undefined && opt.id !== undefined),
  }));
}

/** The companies table; the page loads the companies and salespeople on the server. */
export function CompaniesSection({ initialData, salespersons }: { initialData: CompaniesData; salespersons: AppUser[] }) {
  const [data, setData] = React.useState<CompanyRow[]>(() => toCompanyRows(initialData));
  const [loading, setLoading] = React.useState(false);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  // Fifty rows fit a laptop screen inside the scrolling table; tanstack's
  // default of ten meant paging through dozens of pages.
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 50 });
  const [selectedCompany, setSelectedCompany] = React.useState<CompanyRow | null>(null);
  const [editingCompany, setEditingCompany] = React.useState<CompanyRow | null>(null);
  const [viewMode, setViewMode] = React.useState<"companies" | "users" | "options">("companies");
  const [allSubOptions, setAllSubOptions] = React.useState<CareerSubOption[]>(initialData.allSubOptions ?? []);

  const refreshCompanies = React.useCallback(() => {
    setLoading(true);
    fetchCompaniesWithSubOptionsAction()
      .then((result) => {
        const mapped = toCompanyRows(result);
        setData(mapped);
        setAllSubOptions(result.allSubOptions ?? []);
        setSelectedCompany((prev) => {
          if (!prev) return prev;
          const updated = mapped.find((c) => c.id === prev.id);
          return updated ?? prev;
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const table = useReactTable<CompanyRow>({
    data,
    columns: getCompanyColumns(
      (company) => { setSelectedCompany(company); setViewMode("users"); },
      (company) => { setSelectedCompany(company); setViewMode("options"); },
      (company) => { setEditingCompany(company); }
    ),
    state: { sorting, columnFilters, columnVisibility, rowSelection, globalFilter, pagination },
    onPaginationChange: setPagination,
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

  const filteredCount = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize } = table.getState().pagination;

  return (
    <div className="flex flex-col gap-3">
        <EditCompanyDialog
          company={editingCompany}
          salespersons={salespersons}
          onClose={() => setEditingCompany(null)}
          onSaved={refreshCompanies}
        />
        {selectedCompany && (
          <div className="flex flex-col gap-3 rounded-xl border bg-[#fafafa] p-3 sm:flex-row sm:items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSelectedCompany(null); setViewMode("companies"); }}
              className="self-start sm:self-auto"
            >
              <ChevronLeft className="h-4 w-4" /> Companies
            </Button>
            <div className="flex min-w-0 items-center gap-2.5">
              <CompanyAvatar name={selectedCompany.name} />
              <span className="truncate text-[15px] font-semibold">{selectedCompany.name}</span>
            </div>
            <div className="flex items-center gap-1 rounded-[10px] border bg-background p-0.5 sm:ml-4">
              {([
                ["users", "Representatives", selectedCompany.representatives?.length ?? 0],
                ["options", "Options", selectedCompany.options?.length ?? 0],
              ] as const).map(([mode, label, count]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors ${
                    viewMode === mode ? "bg-[#f0f0f2] text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                  <span className="text-xs text-muted-foreground tabular">{count}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 sm:ml-auto">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/company/${slugifyCompanyName(selectedCompany.name)}`}>
                  <ExternalLink className="h-4 w-4" /> Public page
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditingCompany(selectedCompany)}>
                <Pencil className="h-4 w-4" /> Edit details
              </Button>
            </div>
          </div>
        )}
        {!selectedCompany ? (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search name or VAT…"
                  value={table.getState().globalFilter ?? ""}
                  onChange={e => table.setGlobalFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={(table.getColumn("salesperson")?.getFilterValue() ?? "__all__") as string}
                onValueChange={(val) => table.getColumn("salesperson")?.setFilterValue(val === "__all__" ? undefined : val)}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="__all__" value="__all__">All assignees</SelectItem>
                  {salespersonOptions.map(name => <SelectItem key={String(name)} value={String(name)}>{name}</SelectItem>)}
                </SelectContent>
              </Select>

              <span className="text-sm text-muted-foreground tabular">
                {filteredCount === data.length ? `${data.length} companies` : `${filteredCount} of ${data.length}`}
              </span>

              <div className="flex items-center gap-2 sm:ml-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline"><IconColumns /> <span className="hidden sm:inline">Columns</span><ChevronDown className="h-4 w-4 text-muted-foreground" /></Button>
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
                <CompanyFormDialog
                  onRefresh={refreshCompanies}
                  salespersons={salespersons}
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border bg-background">
                <Table containerClassName="max-h-[calc(100svh-17rem)]">
                  <TableHeader className="sticky top-0 z-10 bg-background shadow-[inset_0_-1px_0_var(--border)] [&_tr]:border-b-0">
                    {table.getHeaderGroups().map(headerGroup => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                          <TableHead key={header.id} className="whitespace-nowrap first:pl-4">
                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {loading && data.length === 0 ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i} className="hover:bg-transparent">
                          <TableCell colSpan={table.getAllColumns().length} className="pl-4">
                            <div className="flex items-center gap-3">
                              <div className="size-7 animate-pulse rounded-lg bg-muted" />
                              <div className="h-3 w-48 animate-pulse rounded bg-muted" />
                              <div className="ml-auto h-3 w-24 animate-pulse rounded bg-muted" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : table.getRowModel().rows.length ? (
                      table.getRowModel().rows.map(row => {
                        const company = row.original as CompanyRow;
                        return (
                          <TableRow
                            key={row.id}
                            tabIndex={0}
                            className="group/row cursor-pointer outline-none focus-visible:bg-surface-hover focus-visible:shadow-[inset_2px_0_0_#1f82d1]"
                            onClick={(e) => {
                              // Menus and dialogs opened from a row are portaled, but React
                              // still bubbles their clicks here; only real row clicks count.
                              if (!e.currentTarget.contains(e.target as Node)) return;
                              if ((e.target as HTMLElement).closest("a, button, [role=checkbox]")) return;
                              setEditingCompany(company);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && e.target === e.currentTarget) setEditingCompany(company);
                            }}
                          >
                            {row.getVisibleCells().map(cell => (
                              <TableCell key={cell.id} className="whitespace-nowrap first:pl-4">{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                            ))}
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={table.getAllColumns().length} className="h-40 text-center text-muted-foreground">
                          No companies match these filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

              {filteredCount > pageSize && (
                <div className="flex items-center justify-between gap-2 border-t bg-[#fafafa] px-4 py-2">
                  <p className="text-xs text-muted-foreground tabular">
                    {pageIndex * pageSize + 1}–{Math.min((pageIndex + 1) * pageSize, filteredCount)} of {filteredCount}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
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
    </div>
  );
}

/** Rounded square with a company's initials, the "identity cell" of a row. */
function CompanyAvatar({ name }: { name?: string | null }) {
  const letters = (name ?? "?")
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border bg-[#fafafa] text-[11px] font-semibold text-[#52525b]">
      {letters}
    </span>
  );
}

/** Count chip that opens one of a company's sub-views (reps, options). */
function CountChip({
  count,
  label,
  onClick,
  icon: Icon,
}: {
  count: number;
  label: string;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`View ${label}`}
      className={`inline-flex h-7 items-center gap-1.5 rounded-lg border px-2 text-[13px] font-medium transition-colors tabular ${
        count > 0
          ? "border-[#e2e2e5] bg-background text-foreground hover:border-[#bee1ff] hover:bg-[#f0f8ff] hover:text-[#0a6cba]"
          : "border-dashed border-[#e2e2e5] text-muted-foreground hover:border-[#d4d4d8] hover:text-foreground"
      }`}
    >
      <Icon className="size-3.5" />
      {count}
    </button>
  );
}

/** ------------------------------------------------------------------
 * Company columns
 * ------------------------------------------------------------------ */
function getCompanyColumns(onViewUsers: (company: CompanyRow) => void, onViewOptions: (company: CompanyRow) => void, onEditCompany: (company: CompanyRow) => void): ColumnDef<CompanyRow>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      enableHiding: false,
      cell: ({ row }) => {
        const company = row.original;
        return (
          <div className="flex min-w-0 items-center gap-2.5">
            <CompanyAvatar name={company.name} />
            <span className="truncate font-medium text-foreground capitalize">{row.getValue("name")}</span>
            {company.status && company.status !== "published" ? (
              <Badge variant="warning" className="capitalize">{company.status}</Badge>
            ) : null}
          </div>
        );
      },
    },
    { accessorKey: "VAT", header: "VAT", cell: ({ row }) => <div className="text-[13px] text-muted-foreground tabular">{row.getValue("VAT") || "—"}</div> },
    { accessorKey: "address", header: "Address", cell: ({ row }) => <div className="max-w-[32ch] truncate text-muted-foreground">{row.getValue("address") || "—"}</div> },
    {
      id: "representatives",
      header: "Reps",
      cell: ({ row }) => (
        <CountChip
          count={row.original.representatives?.length ?? 0}
          label="representatives"
          icon={Users}
          onClick={() => onViewUsers(row.original)}
        />
      ),
    },
    {
      id: "options",
      header: "Options",
      cell: ({ row }) => (
        <CountChip
          count={row.original.options?.length ?? 0}
          label="options"
          icon={Package}
          onClick={() => onViewOptions(row.original)}
        />
      ),
    },
    {
      accessorKey: "salesperson",
      header: "Assignee",
      cell: ({ row }) => {
        const name = String(row.getValue("salesperson") ?? "");
        // The repo reports a missing salesperson as the literal "Not set".
        if (!name || name === "Not set") return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-[#ebebfe] text-[10px] font-semibold text-[#4840ac]">
              {name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
            </span>
            <span className="text-[13px]">{name}</span>
          </div>
        );
      },
      enableColumnFilter: true,
      filterFn: (row, id, value: string) => !value || row.getValue(id) === value,
    },
    {
      id: "actions",
      enableHiding: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const company = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground"><span className="sr-only">Open menu</span><MoreHorizontal /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEditCompany(company)}><Pencil /> Edit details</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewUsers(company)}><Users /> Representatives</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewOptions(company)}><Package /> Options</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/company/${slugifyCompanyName(company.name)}`}>
                    <ExternalLink /> Public company page
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
      cell: ({ row }) => (
        <UserRowActions user={row.original} companyId={companyId} onRemoveUser={onRemoveUser} />
      ),
    },
  ];
}

/** ------------------------------------------------------------------
 * Row actions for a company user. A component of its own because it holds
 * state: hooks cannot be called from a column's `cell` renderer.
 * ------------------------------------------------------------------ */
function UserRowActions({ user, companyId, onRemoveUser }: {
  user: Partial<CompanyRep>;
  companyId: string;
  onRemoveUser: (userId: string) => void;
}) {
  const [isResending, setIsResending] = React.useState(false);
  const isInvited = user?.status === "invited";

  const handleResendInvite = async () => {
    if (!user?.id) return;

    setIsResending(true);
    try {
      const result = await resendInviteAction(user.id, companyId);
      if (result.success) {
        toast.success(`Invitation resent to ${user.email ?? "the user"}.`);
      } else {
        console.error("Failed to resend invitation:", result.error);
        toast.error(`Failed to resend invitation: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error resending invitation:", error);
      toast.error(`Error resending invitation: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsResending(false);
    }
  };

  if (!user?.id) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" aria-label="User actions"><MoreHorizontal /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        {isInvited && (
          <DropdownMenuItem
            onClick={handleResendInvite}
            disabled={isResending}
          >
            {isResending ? "Resending..." : "Resend invite"}
          </DropdownMenuItem>
        )}
        {isInvited && <DropdownMenuSeparator />}
        <RemoveUserDialog
          user={user}
          companyId={companyId}
          onRemove={() => onRemoveUser(user.id!)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
      listSubOptionsAction()
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
    
    // Load the option catalogue through its admin action
    listEventOptionsAction()
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
      listSubOptionsAction()
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
function CompanyFormDialog({ onRefresh, salespersons }: { onRefresh?: () => void; salespersons: AppUser[] }) {
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
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);

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
          <Button>
            <IconPlus /> New company
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
function EditCompanyDialog({ company, salespersons, onClose, onSaved }: {
  company: CompanyRow | null;
  salespersons: AppUser[];
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [form, setForm] = React.useState({ name: "", VAT: "", status: "draft", salesperson: "" });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
