"use client";

import * as React from "react";
import { fetchCompanyByIdAction, fetchCompaniesWithSubOptionsAction, createCompanyAction, updateCompanyAction, createCompanyRepAction, addOptionToCompanyAction, removeOptionFromCompanyAction, addSubOptionToCompanyAction, removeSubOptionFromCompanyAction, addSubOptionToCompanyOnlyAction, removeSubOptionFromCompanyOnlyAction, removeUserFromCompanyAction, processCompaniesCSVAction, resendInviteAction, fetchCompanyOptionsDebugAction } from "@/app/actions/companies";
import { fetchEventsAction } from "@/app/actions/events";
import { listSubOptionsAction, listEventOptionsAction } from "@/app/actions/career-options";
import { ChevronLeft, ExternalLink, Loader2, MoreHorizontal, Package, Pencil, Upload, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { IconBuilding, IconMail, IconPlus, IconTaxEuro } from "@tabler/icons-react";
import type { AcademicYear, CareerEvent, Company, CompanyRep, CareerEventOption, CareerSubOption, Master } from "@/lib/schema";
import type { UserSummary as AppUser } from "@/lib/schema";
import { slugifyCompanyName } from "@/lib/utils/slugify";
import { toast } from "sonner";
import { ResourceEditor } from "@/components/admin/ResourceManager";
import type { ColumnConfig, SelectOption } from "@/components/admin/types";
import { DataTable } from "@/components/admin/DataTable";
import { fetchAdminUserAction } from "@/app/actions/admin-users";
import type { AdminUserRow } from "@/lib/repos/users";
import { userResourceConfig } from "../users/user-config";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SettingsCompanyProvider } from "@/app/(protected)/dashboard/settings/settings-company";
import { CompanyInformationForm } from "@/app/(protected)/dashboard/settings/information/company-information-form";
import { BillingForm } from "@/app/(protected)/dashboard/settings/billing/billing-form";

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
type CompanyRow = Pick<Company, "id" | "name" | "VAT" | "address" | "address_city" | "address_country" | "salesperson" | "status"> & {
  representatives?: Partial<CompanyRep>[];
  options?: CareerEventOptionWithCompanySubOptions[];
  /** Company-level sub-options (from company.sub_options junction) */
  sub_options?: CareerSubOption[];
  option_history?: NonNullable<Company["option_history"]>;
  sub_option_history?: NonNullable<Company["sub_option_history"]>;
  /** `salesperson` is the display name; this is the id the edit form saves. */
  salesperson_id?: string | null;
  /** Names of the masters the company targets, for the Masters filter. */
  master_names?: string[];
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

/** What a representative's Edit needs to open the User Management form. */
const UserEditContext = React.createContext<{
  roleOptions: SelectOption[];
  companyOptions: SelectOption[];
  onSaved: () => void;
} | null>(null);

/** Names of a company's target masters, from the `category` junction. */
function masterNamesOf(company: Company): string[] {
  return (company.category ?? [])
    .map((entry) => {
      const master = entry && typeof entry === "object" && "master_id" in entry ? entry.master_id : entry;
      return master && typeof master === "object" && "name" in master ? String(master.name) : null;
    })
    .filter((name): name is string => Boolean(name));
}

/** The table's rows: each company with its options' events and sub-options resolved. */
function toCompanyRows({ companies: rows, allSubOptions }: CompaniesData): CompanyRow[] {
  return (rows ?? []).map((r: Company & { status?: string }) => ({
    id: r.id,
    name: r.name,
    VAT: r.VAT ?? "",
    address: r.address ?? formatAddress(r),
    address_city: r.address_city ?? "",
    address_country: r.address_country ?? "",
    master_names: masterNamesOf(r),
    salesperson: r.salesperson ?? "",
    salesperson_id: (r as { salesperson_id?: string | null }).salesperson_id ?? null,
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
export function CompaniesSection({
  initialData,
  salespersons,
  roleOptions,
  masters,
}: {
  initialData: CompaniesData;
  salespersons: AppUser[];
  /** For editing a representative with the User Management form. */
  roleOptions: SelectOption[];
  /** For the target masters on the Company information tab. */
  masters: Master[];
}) {
  const [data, setData] = React.useState<CompanyRow[]>(() => toCompanyRows(initialData));
  const [loading, setLoading] = React.useState(false);
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

  const columns = getCompanyColumns(
    (company) => { setSelectedCompany(company); setViewMode("users"); },
    (company) => { setSelectedCompany(company); setViewMode("options"); }
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

  const companyOptions = React.useMemo(
    () => data.map((c) => ({ value: c.id, label: c.name || "(unnamed)" })),
    [data]
  );

  return (
    <UserEditContext.Provider value={{ roleOptions, companyOptions, onSaved: refreshCompanies }}>
      <div className="flex flex-col gap-3">
          <EditCompanyDialog
            company={editingCompany}
            salespersons={salespersons}
            masters={masters}
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
            <DataTable
              rows={data}
              columns={columns}
              getRowId={(company) => company.id}
              noun="company"
              nounPlural="companies"
              defaultSort={{ key: "name" }}
              loading={loading}
              containerClassName="roomy:max-h-[calc(100svh-17rem)]"
              onRowClick={setEditingCompany}
              isRowSelected={(company) => editingCompany?.id === company.id}
              rowActionsAlwaysVisible
              rowActions={(company) => (
                <CompanyRowMenu
                  company={company}
                  onEdit={() => setEditingCompany(company)}
                  onViewUsers={() => { setSelectedCompany(company); setViewMode("users"); }}
                  onViewOptions={() => { setSelectedCompany(company); setViewMode("options"); }}
                />
              )}
              toolbar={<CompanyFormDialog onRefresh={refreshCompanies} salespersons={salespersons} />}
            />
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
    </UserEditContext.Provider>
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
function getCompanyColumns(
  onViewUsers: (company: CompanyRow) => void,
  onViewOptions: (company: CompanyRow) => void
): ColumnConfig<CompanyRow>[] {
  return [
    {
      key: "name",
      label: "Name",
      render: (company) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <CompanyAvatar name={company.name} />
          <span className="truncate font-medium text-foreground capitalize">{company.name}</span>
          {company.status && company.status !== "published" ? (
            <Badge variant="warning" className="capitalize">{company.status}</Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: "VAT",
      label: "VAT",
      render: (company) => <span className="text-[13px] text-muted-foreground tabular">{company.VAT || "—"}</span>,
    },
    {
      key: "address",
      label: "Address",
      render: (company) => <span className="text-muted-foreground">{company.address || "—"}</span>,
    },
    { key: "address_city", label: "City", defaultHidden: true },
    { key: "address_country", label: "Country", filter: true },
    {
      key: "status",
      label: "Status",
      defaultHidden: true,
      render: (company) => <span className="capitalize">{company.status || "—"}</span>,
      filter: true,
    },
    {
      key: "master_names",
      label: "Masters",
      defaultHidden: true,
      value: (company) => company.master_names,
      render: (company) => company.master_names?.join(", ") || "—",
      filter: true,
    },
    {
      key: "representatives",
      label: "Reps",
      value: (company) => company.representatives?.length ?? 0,
      searchable: false,
      render: (company) => (
        <CountChip
          count={company.representatives?.length ?? 0}
          label="representatives"
          icon={Users}
          onClick={() => onViewUsers(company)}
        />
      ),
    },
    {
      key: "options",
      label: "Options",
      value: (company) => company.options?.length ?? 0,
      searchable: false,
      render: (company) => (
        <CountChip
          count={company.options?.length ?? 0}
          label="options"
          icon={Package}
          onClick={() => onViewOptions(company)}
        />
      ),
    },
    {
      // The packages a company bought this year, to filter on; the Options
      // column above only counts them.
      key: "option_names",
      label: "Packages",
      defaultHidden: true,
      value: (company) => (company.options ?? []).map((option) => option.name),
      render: (company) => (company.options ?? []).map((option) => option.name).join(", ") || "—",
      filter: true,
    },
    {
      key: "salesperson",
      label: "Assignee",
      filter: true,
      render: (company) => {
        const name = String(company.salesperson ?? "");
        if (!name) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-[#ebebfe] text-[10px] font-semibold text-[#4840ac]">
              {name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
            </span>
            <span className="text-[13px]">{name}</span>
          </div>
        );
      },
    },
  ];
}

/** The ⋯ menu at the end of a company row. */
function CompanyRowMenu({ company, onEdit, onViewUsers, onViewOptions }: {
  company: CompanyRow;
  onEdit: () => void;
  onViewUsers: () => void;
  onViewOptions: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground"><span className="sr-only">Open menu</span><MoreHorizontal /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}><Pencil /> Edit details</DropdownMenuItem>
        <DropdownMenuItem onClick={onViewUsers}><Users /> Representatives</DropdownMenuItem>
        <DropdownMenuItem onClick={onViewOptions}><Package /> Options</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/company/${slugifyCompanyName(company.name)}`}>
            <ExternalLink /> Public company page
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** ------------------------------------------------------------------
 * Company Users Table (full-featured)
 * - uses Partial<CompanyRep> for data so newly created users can be partial
 * ------------------------------------------------------------------ */
function CompanyUsersTable({ company, onAddUser, onRemoveUser }: { company: CompanyRow; onAddUser: (newUser: Partial<CompanyRep>) => void; onRemoveUser: (userId: string) => void }) {
  // Local state to allow adding partial users immediately
  const [localRows, setLocalRows] = React.useState<Partial<CompanyRep>[]>(company.representatives ?? []);

  // keep localRows in sync when company changes (e.g. when switching companies)
  React.useEffect(() => {
    setLocalRows(company.representatives ?? []);
  }, [company.id, company.representatives]);

  // Called by UserFormDialog. Persist locally and call parent callback to update outer state.
  const handleCreate = (newUser: Partial<CompanyRep>) => {
    // append locally
    setLocalRows(prev => [...prev, newUser]);
    // notify parent to update main data array + selectedCompany
    onAddUser(newUser);
  };

  return (
    <DataTable
      rows={localRows}
      columns={USER_COLUMNS}
      // A user created a moment ago may not have an id back yet.
      getRowId={(user) => String(user.id ?? user.email ?? "")}
      noun="representative"
      search={{ placeholder: "Search representatives…" }}
      defaultSort={{ key: "first_name" }}
      containerClassName=""
      rowActionsAlwaysVisible
      rowActions={(user) => <UserRowActions user={user} companyId={company.id} onRemoveUser={onRemoveUser} />}
      toolbar={<UserFormDialog company={company} onCreate={handleCreate} />}
    />
  );
}

/** A company's representatives; `status` is the account status (active, invited, ...). */
const USER_COLUMNS: ColumnConfig<Partial<CompanyRep>>[] = [
  { key: "first_name", label: "First name", className: "capitalize" },
  { key: "last_name", label: "Last name", className: "capitalize" },
  { key: "email", label: "Email" },
  { key: "status", label: "Status", className: "capitalize", filter: true },
];

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
  const userEdit = React.useContext(UserEditContext);
  const [editRow, setEditRow] = React.useState<AdminUserRow | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editorKey, setEditorKey] = React.useState(0);

  // The same form as User Management, loaded fresh so it shows every field.
  const openEditor = async () => {
    if (!user?.id) return;
    const row = await fetchAdminUserAction(user.id).catch(() => null);
    if (!row) {
      toast.error("This user could not be loaded.");
      return;
    }
    setEditRow(row);
    setEditorKey((k) => k + 1);
    setEditorOpen(true);
  };

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
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" aria-label="User actions"><MoreHorizontal /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          {userEdit && <DropdownMenuItem onClick={openEditor}>Edit</DropdownMenuItem>}
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
      {editRow && userEdit ? (
        <ResourceEditor
          key={editorKey}
          config={userResourceConfig(userEdit.roleOptions, userEdit.companyOptions)}
          open={editorOpen}
          onOpenChange={setEditorOpen}
          row={editRow}
          onSaved={userEdit.onSaved}
        />
      ) : null}
    </>
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
  // "invite" mails a link so the rep picks a password; "password" lets the
  // admin set one, for accounts whose address is not a real inbox.
  const [mode, setMode] = React.useState<"invite" | "password">("invite");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setMode("invite");
      setError(null);
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const fd = new FormData(formEl);

    const newUser: Partial<CompanyRep> = {
      first_name: String(fd.get("firstName") ?? "").trim() || undefined,
      last_name: String(fd.get("lastName") ?? "").trim() || undefined,
      email: String(fd.get("email") ?? "").trim() || undefined,
      tel: String(fd.get("number") ?? "").trim() || undefined,
      title: String(fd.get("funct") ?? "").trim() || undefined,
      role: "d5475bf4-a77f-48de-b06c-fac199b0f631", // fixed role id as requested
      status: "invited",
    };

    if (mode === "password") {
      const password = String(fd.get("password") ?? "");
      if (password.length < 8) {
        setError("The password needs at least 8 characters.");
        return;
      }
      if (password !== String(fd.get("passwordConfirm") ?? "")) {
        setError("The passwords do not match.");
        return;
      }
      setSaving(true);
      setError(null);
      try {
        await createCompanyRepAction(company.id, newUser, { password });
        toast.success(`${newUser.email} can now sign in with the password you set.`);
        onCreate({ ...newUser, status: "active" });
        onOpenChange(false);
        formEl.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create user");
      } finally {
        setSaving(false);
      }
      return;
    }

    createCompanyRepAction(company.id, newUser)

    onCreate(newUser); // parent will incorporate into CompanyRow.representatives
    onOpenChange(false);
    formEl.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

          <div className="w-full flex flex-col gap-2">
            <Label className="text-xs">Account access</Label>
            <RadioGroup value={mode} onValueChange={(v) => { setMode(v as "invite" | "password"); setError(null); }}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="invite" id="mode-invite" />
                <Label htmlFor="mode-invite" className="font-normal cursor-pointer">Send an invite link by e-mail</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="password" id="mode-password" />
                <Label htmlFor="mode-password" className="font-normal cursor-pointer">Set a password now (no e-mail is sent)</Label>
              </div>
            </RadioGroup>
          </div>

          {mode === "password" && (
            <>
              <p className="text-xs text-muted-foreground">
                The account is active right away. The e-mail address is only used to sign in, so it does not have to be a real inbox.
              </p>
              <div className="w-full">
                <Label htmlFor="password" className="text-xs">Password* (at least 8 characters)</Label>
                <Input name="password" id="password" type="password" autoComplete="new-password" minLength={8} required />
              </div>
              <div className="w-full">
                <Label htmlFor="passwordConfirm" className="text-xs">Confirm password*</Label>
                <Input name="passwordConfirm" id="passwordConfirm" type="password" autoComplete="new-password" minLength={8} required />
              </div>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
              {saving ? "Creating..." : mode === "password" ? "Create user" : "Submit"}
            </Button>
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
  // Local state to allow adding options immediately
  const [localRows, setLocalRows] = React.useState<CareerEventOptionWithCompanySubOptions[]>(company.options ?? []);

  // keep localRows in sync when company changes (e.g. when switching companies)
  React.useEffect(() => {
    setLocalRows(company.options ?? []);
  }, [company.id, company.options]);

  // Called by OptionFormDialog. Persist locally and call parent callback to update outer state.
  const handleCreate = (newOption: CareerEventOption) => {
    // append locally
    setLocalRows(prev => [...prev, newOption]);
    // notify parent to update main data array + selectedCompany
    onAddOption(newOption);
  };

  return (
    <DataTable
      rows={localRows}
      columns={getOptionColumns(company.id, onSubOptionsChange)}
      getRowId={(option) => String(option.id)}
      noun="option"
      containerClassName=""
      rowActionsAlwaysVisible
      rowActions={(option) => (
        <RemoveOptionDialog
          option={option}
          companyId={company.id}
          onRemove={() => onRemoveOption(option.id)}
        />
      )}
      toolbar={<OptionFormDialog company={company} onCreate={handleCreate} />}
    />
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

  return (
    <section className="space-y-3 border-t pt-6">
      <div>
        <h3 className="text-lg font-semibold">Previous academic years</h3>
        <p className="text-sm text-muted-foreground">
          Read-only purchase history. Names and prices are the values recorded at the time of sale.
        </p>
      </div>

      <DataTable
        rows={rows}
        columns={HISTORY_COLUMNS}
        getRowId={(row) => row.id}
        noun="purchase"
        defaultSort={{ key: "academicYear", desc: true }}
        emptyMessage="No purchases recorded for previous academic years"
        containerClassName=""
      />
    </section>
  );
}

const HISTORY_COLUMNS: ColumnConfig<CompanyOptionHistoryRow>[] = [
  { key: "name", label: "Name" },
  { key: "kind", label: "Type", filter: true },
  {
    key: "academicYear",
    label: "Academic year",
    // Names like "2025-2026" sort chronologically as text.
    value: (row) => row.academicYear?.name ?? null,
    render: (row) => row.academicYear?.name ?? "Legacy / unknown",
    filter: true,
  },
  { key: "events", label: "Events", value: (row) => row.events },
  {
    key: "price",
    label: "Sale price",
    value: (row) => row.price,
    render: (row) => formatHistoricalPrice(row.price),
  },
  {
    key: "status",
    label: "Status",
    filter: { options: [{ value: "sold", label: "Purchased" }] },
    render: (row) => (
      <Badge variant={row.status === "sold" ? "success" : "muted"} className="capitalize">
        {row.status === "sold" ? "Purchased" : row.status}
      </Badge>
    ),
  },
  {
    key: "dateCreated",
    label: "Recorded",
    value: (row) => (row.dateCreated ? new Date(row.dateCreated) : null),
    render: (row) => formatHistoryDate(row.dateCreated),
  },
];

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
      <DialogContent className="sm:max-w-md">
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
/** Names of the events an option belongs to, whichever shape they arrive in. */
function optionEventNames(option: CareerEventOption): string[] {
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
    if (eventNames.length > 0) return eventNames;
  }

  // Fallback: try to handle single event (for backward compatibility)
  const single = option.event ? getEventName(option.event) : null;
  return single ? [single] : [];
}

function getOptionColumns(
  companyId: string,
  onSubOptionsChange?: () => void
): ColumnConfig<CareerEventOptionWithCompanySubOptions>[] {
  return [
    { key: "name", label: "Name" },
    {
      key: "description",
      label: "Description",
      value: (option) => stripHtml(String(option.description ?? "")),
      render: (option) => <div className="truncate max-w-[48ch]">{stripHtml(String(option.description ?? ""))}</div>,
    },
    { key: "price", label: "Price", className: "font-medium" },
    {
      key: "sub_options",
      label: "Sub-options",
      render: (option) => (
        <SubOptionsDialog
          companyId={companyId}
          option={option}
          companySubOptions={option.companySubOptions ?? []}
          availableSubOptions={option.sub_options ?? []}
          onUpdate={onSubOptionsChange}
        />
      ),
    },
    {
      key: "event",
      label: "Events",
      value: (option) => optionEventNames(option),
      render: (option) => {
        const eventNames = optionEventNames(option);
        if (!eventNames.length) return <div className="font-medium">—</div>;
        return (
          <div className="font-medium">
            {eventNames.length === 1
              ? eventNames[0]
              : `${eventNames.length} events: ${eventNames.join(', ')}`
            }
          </div>
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
      <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto">
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
                    // In normal flow, not absolute: the dialog scrolls (overflow-y-auto),
                    // which clipped an absolute list after one or two suggestions.
                    className="w-full mt-1 max-h-[300px] overflow-y-auto rounded-md border bg-popover shadow-md"
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
                  <div className="w-full mt-1 rounded-md border bg-popover shadow-md p-3 text-sm text-muted-foreground">
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
    const country = String(fd.get("country") ?? "").trim();

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

            {/* Country gets its own row on a phone; a fifth of the width can't hold it. */}
            <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-[2fr_2fr_1fr]">
              <div>
                <Label htmlFor="zip" className="text-xs">
                  ZIP
                </Label>
                <Input name="zip" id="zip" placeholder="3001" />
              </div>
              <div>
                <Label htmlFor="city" className="text-xs">
                  City
                </Label>
                <Input name="city" id="city" placeholder="Leuven" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="country" className="text-xs">
                  Country
                </Label>
                <Input name="country" id="country" placeholder="Belgium" />
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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
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
type EditTab = "admin" | "information" | "billing";

/**
 * Edits a company as fully as its representatives can, plus what only VTK
 * sets. The Company information and Billing tabs are the very forms reps use
 * in their own settings, so an admin can make any change for them instead of
 * explaining it; the Admin tab holds the status and salesperson.
 */
function EditCompanyDialog({ company, salespersons, masters, onClose, onSaved }: {
  company: CompanyRow | null;
  salespersons: AppUser[];
  masters: Master[];
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [tab, setTab] = React.useState<EditTab>("admin");
  // The table row is a summary; the forms need the whole company.
  const [full, setFull] = React.useState<Company | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ status: "draft", salesperson: "" });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const changed = React.useRef(false);

  React.useEffect(() => {
    if (!company) return;
    let alive = true;
    setTab("admin");
    setFull(null);
    setLoadError(null);
    setError(null);
    changed.current = false;
    setForm({
      status: company.status || "draft",
      // company.salesperson is the display name; the form needs the id.
      salesperson: company.salesperson_id ?? "",
    });
    fetchCompanyByIdAction(company.id)
      .then((loaded) => {
        if (!alive) return;
        if (loaded) setFull(loaded);
        else setLoadError("This company could not be loaded.");
      })
      .catch(() => alive && setLoadError("This company could not be loaded."));
    return () => {
      alive = false;
    };
  }, [company]);

  // The settings forms announce their saves with this event (for the
  // sidebar); it also tells the table to reload when the panel closes.
  React.useEffect(() => {
    const onUpdated = () => {
      changed.current = true;
    };
    window.addEventListener("company-updated", onUpdated);
    return () => window.removeEventListener("company-updated", onUpdated);
  }, []);

  const close = () => {
    if (changed.current) onSaved?.();
    onClose();
  };

  const onSubmitAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setSaving(true);
    setError(null);
    try {
      await updateCompanyAction(company.id, {
        status: form.status,
        ...(form.salesperson ? { salesperson: form.salesperson } : {}),
      } as Partial<Company>);
      changed.current = true;
      toast.success("Saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update company");
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: EditTab; label: string }[] = [
    { id: "admin", label: "Admin" },
    { id: "information", label: "Company information" },
    { id: "billing", label: "Billing" },
  ];

  return (
    <Sheet open={!!company} onOpenChange={(o) => { if (!o) close(); }}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-3xl sm:rounded-l-2xl">
        <SheetHeader className="shrink-0 gap-3 border-b px-5 pt-4 pb-0">
          <SheetTitle className="text-base">{company?.name || "Edit company"}</SheetTitle>
          <SheetDescription className="sr-only">Edit this company</SheetDescription>
          <div className="scrollbar-hide -mx-5 -mb-px flex gap-1 overflow-x-auto px-5" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  tab === t.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </SheetHeader>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {tab === "admin" ? (
            <form onSubmit={onSubmitAdmin} className="flex max-w-md flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Set by VTK only. Everything the company can change itself is on the other tabs.
              </p>
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
              <div>
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
              </div>
            </form>
          ) : loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : !full ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading company…
            </p>
          ) : (
            <SettingsCompanyProvider initialCompany={full}>
              {tab === "information" ? (
                <CompanyInformationForm masters={masters} showPageLink={false} />
              ) : (
                <BillingForm />
              )}
            </SettingsCompanyProvider>
          )}
        </div>
      </SheetContent>
    </Sheet>
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
