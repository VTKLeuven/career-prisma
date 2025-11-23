"use client";

import * as React from "react";
import { fetchCompaniesAction, createCompanyAction, createCompanyRepAction, addOptionToCompanyAction, removeOptionFromCompanyAction, removeUserFromCompanyAction, processCompaniesCSVAction } from "@/app/actions/companies";
import { fetchEventsAction, findCompaniesWithEventOptions, addCompaniesToEventPageAction } from "@/app/actions/events";
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
import { IconBuilding, IconColumns, IconMail, IconPlus, IconTaxEuro, IconFileCv } from "@tabler/icons-react";
import type { CareerEvent, Company, CompanyRep, CareerEventOption, CareerEventPage, Booth } from "@/lib/schema";
import { useUser } from "@/providers/UserProvider";
import { DirectusUser } from "@directus/sdk";
import { slugifyCompanyName } from "@/lib/utils/slugify";

/**
 * Notes about typing decisions:
 * - Per your request, company.representatives may be undefined from the backend.
 *   We normalize and operate on Partial<CompanyRep>[] for the users table so new users
 *   can be created without an id/company/etc. yet.
 * - role stays a string id.
 */

/** ------------------------------------------------------------------
 * CompanyRow — allow representatives to be Partial<CompanyRep>[]
 * ------------------------------------------------------------------ */
type CompanyRow = Pick<Company, "id" | "name" | "VAT" | "address" | "salesperson"> & {
  representatives?: Partial<CompanyRep>[];
  options?: CareerEventOption[];
};

export default function AdminPage() {
  const { user } = useUser();
  if (!user?.admin) return <p>NO ACCESS</p>;

  return (
    <div className="flex flex-col gap-4">
      <CompaniesSection />
      <EventsSection />
    </div>
  );
}

/** ------------------------------------------------------------------
 * Companies section
 * ------------------------------------------------------------------ */
function CompaniesSection() {
  const [data, setData] = React.useState<CompanyRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [selectedCompany, setSelectedCompany] = React.useState<CompanyRow | null>(null);
  const [viewMode, setViewMode] = React.useState<"companies" | "users" | "options">("companies");

  const refreshCompanies = React.useCallback(() => {
    setLoading(true);
    fetchCompaniesAction()
      .then((rows) => {
        // Normalize representatives to Partial<CompanyRep>[]
        const mapped: CompanyRow[] = (rows ?? []).map((r: Company) => ({
          id: r.id,
          name: r.name,
          VAT: r.VAT ?? "",
          address: r.address ?? formatAddress(r),
          salesperson: r.salesperson ?? "",
          representatives: (r.representatives ?? []).map((rep) => ({ ...rep })) as Partial<CompanyRep>[],
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
            
            // Create a new object to avoid mutation, preserving all fields
            const normalizedOption: CareerEventOption = {
              id: rawOption.id,
              name: rawOption.name,
              description: rawOption.description,
              price: rawOption.price,
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
          }).filter((opt): opt is CareerEventOption => opt !== null && opt !== undefined && opt.id !== undefined),
        }));
        setData(mapped);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    let alive = true;
    fetchCompaniesAction()
      .then((rows) => {
        if (!alive) return;
        // Normalize representatives to Partial<CompanyRep>[]
        const mapped: CompanyRow[] = (rows ?? []).map((r: Company) => ({
          id: r.id,
          name: r.name,
          VAT: r.VAT ?? "",
          address: r.address ?? formatAddress(r),
          salesperson: r.salesperson ?? "",
          representatives: (r.representatives ?? []).map((rep) => ({ ...rep })) as Partial<CompanyRep>[],
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
            
            // Create a new object to avoid mutation, preserving all fields
            const normalizedOption: CareerEventOption = {
              id: rawOption.id,
              name: rawOption.name,
              description: rawOption.description,
              price: rawOption.price,
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
          }).filter((opt): opt is CareerEventOption => opt !== null && opt !== undefined && opt.id !== undefined),
        }));
        setData(mapped);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    return () => { alive = false; };
  }, []);

  const table = useReactTable<CompanyRow>({
    data,
    columns: getCompanyColumns(
      (company) => { setSelectedCompany(company); setViewMode("users"); },
      (company) => { setSelectedCompany(company); setViewMode("options"); }
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
                onCreate={(newRow) => setData(prev => [newRow, ...prev])} 
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
                      table.getRowModel().rows.map(row => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map(cell => (
                            <TableCell key={cell.id} className="whitespace-nowrap">{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                          ))}
                        </TableRow>
                      ))
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
          <CompanyOptionsTable
            company={selectedCompany}
            onAddOption={(newOption) => {
              // locally add option and also update main data list
              addOptionToCompany(selectedCompany.id, newOption);
            }}
            onRemoveOption={(optionId) => {
              // locally remove option and also update main data list
              removeOptionFromCompany(selectedCompany.id, optionId);
            }}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

/** ------------------------------------------------------------------
 * Company columns
 * ------------------------------------------------------------------ */
function getCompanyColumns(onViewUsers: (company: CompanyRow) => void, onViewOptions: (company: CompanyRow) => void): ColumnDef<CompanyRow>[] {
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
              <DropdownMenuItem onClick={() => console.log("Edit", company.id)}>Edit Company</DropdownMenuItem>
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
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => console.log("Edit user", user)}>Edit</DropdownMenuItem>
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
 * Company Options Table (full-featured)
 * - displays all options a company has
 * ------------------------------------------------------------------ */
function CompanyOptionsTable({ company, onAddOption, onRemoveOption }: { company: CompanyRow; onAddOption: (newOption: CareerEventOption) => void; onRemoveOption: (optionId: string) => void }) {
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

  const table = useReactTable<CareerEventOption>({
    data: localRows,
    columns: getOptionColumns(onRemoveOption, company.id) as ColumnDef<CareerEventOption>[],
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
 * Option columns definition
 * ------------------------------------------------------------------ */
function getOptionColumns(onRemoveOption: (optionId: string) => void, companyId: string): ColumnDef<CareerEventOption>[] {
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
  const [warning, setWarning] = React.useState<string | null>(null);

  const handleRemove = () => {
    if (!user?.id) return;

    setError(null);
    setWarning(null);

    removeUserFromCompanyAction(companyId, user.id)
      .then((result) => {
        if (result?.success) {
          onRemove();
          if (result.warning) {
            setWarning(result.warning);
            // Still close after a short delay to show the warning
            setTimeout(() => setOpen(false), 2000);
          } else {
            setOpen(false);
          }
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
        setWarning(null);
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
            Are you sure you want to remove {userName} from this company? This will attempt to delete the user from Directus. If the user has uploaded files or other references, they will only be removed from this company.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {error}
          </div>
        )}
        {warning && (
          <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
            {warning}
          </div>
        )}
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => {
            setOpen(false);
            setError(null);
            setWarning(null);
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
  const [allOptions, setAllOptions] = React.useState<CareerEventOption[]>([]);
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
        
        // Normalize options: ensure events array is properly structured
        // In Directus many-to-many, events come as array of junction table entries
        return options.map((option: any) => {
          const normalized: CareerEventOption = {
            id: option.id,
            name: option.name,
            description: option.description,
            price: option.price,
            events: [],
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

    // Call server action to add option to company
    addOptionToCompanyAction(company.id, selectedOptionId)
      .then(() => {
        onCreate(selectedOption);
        setOpen(false);
        setSelectedOptionId("");
        setSearchQuery("");
        (e.target as HTMLFormElement).reset();
      })
      .catch((error) => {
        console.error("Error adding option to company:", error);
      });
  };

  // Reset search when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedOptionId("");
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
function CompanyFormDialog({ onCreate, onRefresh }: { onCreate: (row: CompanyRow) => void; onRefresh?: () => void }) {
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
  const [salespersons, setSalespersons] = React.useState<DirectusUser[]>([]);

  React.useEffect(() => {
    async function fetchSalespersons() {
      const users = await fetchSalespersonsAction();
      if (users) setSalespersons(users);
    }
    fetchSalespersons();
  }, []);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
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

    const newRow: CompanyRow = {
      id: crypto.randomUUID(),
      name: companyName,
      VAT: vat,
      address: addr,
      salesperson,
      representatives: [],
    };

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

    // TODO: call a server action to persist (create Company + create User and relate)
    createCompanyAction(newCompany, newRep)

    onCreate(newRow);
    setOpen(false);
    (e.target as HTMLFormElement).reset();
    setSalesperson("");
    console.log({ companyName, vat, firstName, lastName, email, salesperson, street, number, zip, city, country });
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
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="submit" disabled={!salesperson} className="w-full sm:w-auto">Save</Button>
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
          <DialogTitle>Upload Companies (CSV/Excel)</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file with company data. Column names should match the form field names.
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
              accept=".csv,.xlsx,.xls"
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
function EventsSection() {
  const [events, setEvents] = React.useState<CareerEvent[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    fetchEventsAction()
      .then(rows => { if (!alive) return; setEvents(rows ?? []); })
      .catch(console.error)
      .finally(() => setLoading(false));
    return () => { alive = false; };
  }, []);

  return (
    <Card className="rounded-2xl shadow-md">
      <CardHeader className="flex justify-between">
        <CardTitle className="text-2xl">Manage Events</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-24 grid place-items-center text-sm text-muted-foreground">Loading events…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
            {events.map(e => <EventCard key={e.id ?? e.name} event={e} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EventCard({ event }: { event: CareerEvent }) {
  const hours = [event.start_hour, event.end_hour].filter(Boolean).join(" – ");
  const [hasFloorplan, setHasFloorplan] = React.useState<boolean | null>(null);
  const [hasCompanyGuide, setHasCompanyGuide] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkFloorplan = async () => {
      try {
        const { getEventPageWithFloorplan } = await import("@/lib/repos/floorplan");
        const eventPage = await getEventPageWithFloorplan(event.id);
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
      } catch (error) {
        console.error("Error checking floorplan:", error);
        setHasFloorplan(false);
        setHasCompanyGuide(false);
      } finally {
        setLoading(false);
      }
    };
    checkFloorplan();
  }, [event.id]);

  return (
    <Card className="border rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle>{event.name}</CardTitle>
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
        </div>
      </CardContent>
    </Card>
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
          Add companies
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Companies to {event.name}</DialogTitle>
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

