"use client";

import * as React from "react";
import { fetchCompaniesAction, createCompanyAction, createCompanyRepAction, addOptionToCompanyAction, removeOptionFromCompanyAction, removeUserFromCompanyAction, fetchPendingApprovalRequestsAction, approveRepRequestAction } from "@/app/actions/companies";
import { fetchEventsAction } from "@/app/actions/events";
import { fetchSalespersonsAction } from "@/app/actions/salespeople";
import type { PendingApprovalRequest } from "@/lib/repos/users";
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
import { ChevronDown, MoreHorizontal, X } from "lucide-react";
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
import type { CareerEvent, Company, CompanyRep, CareerEventOption } from "@/lib/schema";
import { useUser } from "@/providers/UserProvider";
import { DirectusUser } from "@directus/sdk";

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
      <PendingApprovalsSection />
      <CompaniesSection />
      <EventsSection />
    </div>
  );
}

/** ------------------------------------------------------------------
 * Pending Approvals section
 * ------------------------------------------------------------------ */
function PendingApprovalsSection() {
  const { user } = useUser();
  const [pendingRequests, setPendingRequests] = React.useState<PendingApprovalRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [processing, setProcessing] = React.useState<string | null>(null);

  // Check if user is a salesperson (they have admin access or sales role)
  // For now, we'll show this to all admins - the server action will filter by role
  const shouldShow = user?.admin;

  React.useEffect(() => {
    if (!shouldShow) {
      setLoading(false);
      return;
    }

    let alive = true;
    fetchPendingApprovalRequestsAction()
      .then((requests) => {
        if (!alive) return;
        setPendingRequests(requests);
      })
      .catch(console.error)
      .finally(() => {
        if (alive) setLoading(false);
      });

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      if (!alive) return;
      fetchPendingApprovalRequestsAction()
        .then((requests) => {
          if (!alive) return;
          setPendingRequests(requests);
        })
        .catch(console.error);
    }, 30000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [shouldShow]);

  const handleApprove = async (requestId: string) => {
    setProcessing(requestId);
    try {
      const result = await approveRepRequestAction(requestId, "approve");
      if (result.success) {
        // Remove from list
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
        // Refresh after a short delay to allow backend processing
        setTimeout(() => {
          fetchPendingApprovalRequestsAction()
            .then((requests) => setPendingRequests(requests))
            .catch(console.error);
        }, 1000);
      } else {
        alert(`Failed to approve: ${result.error}`);
      }
    } catch (error) {
      console.error("Error approving request:", error);
      alert("Failed to approve request");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessing(requestId);
    try {
      const result = await approveRepRequestAction(requestId, "reject");
      if (result.success) {
        // Remove from list
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      } else {
        alert(`Failed to reject: ${result.error}`);
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
      alert("Failed to reject request");
    } finally {
      setProcessing(null);
    }
  };

  if (!shouldShow) {
    return null;
  }

  const formatAddress = (company: PendingApprovalRequest["company"]) => {
    if (!company) return "N/A";
    const parts = [
      company.address_street && company.address_number
        ? `${company.address_street} ${company.address_number}`.trim()
        : company.address_street || company.address_number || "",
      company.address_zip && company.address_city
        ? `${company.address_zip} ${company.address_city}`.trim()
        : company.address_zip || company.address_city || "",
      company.address_country || "",
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "N/A";
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl">Pending Approvals</CardTitle>
            {pendingRequests.length > 0 && (
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-500 text-white text-sm font-bold">
                {pendingRequests.length}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : pendingRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending approval requests</p>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="border rounded-lg p-4 bg-white shadow-sm"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">Company Information</h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Name:</strong> {request.company?.name || "N/A"}</p>
                      <p><strong>VAT:</strong> {request.company?.VAT || "N/A"}</p>
                      <p><strong>Address:</strong> {formatAddress(request.company)}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">New User Information</h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Name:</strong> {request.first_name || ""} {request.last_name || ""}</p>
                      <p><strong>Email:</strong> {request.email}</p>
                      <p><strong>Phone:</strong> {request.tel || "N/A"}</p>
                      <p><strong>Function:</strong> {request.title || "N/A"}</p>
                      <p><strong>Requested:</strong> {formatDate(request.date_created)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReject(request.id)}
                    disabled={processing === request.id}
                  >
                    {processing === request.id ? "Processing..." : "Reject"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(request.id)}
                    disabled={processing === request.id}
                  >
                    {processing === request.id ? "Processing..." : "Approve"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
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
          options: (r.options ?? []).map((opt) => {
            // Handle both direct CareerEventOption and junction table format
            if (opt && typeof opt === 'object' && 'career_event_option_id' in opt) {
              const junction = opt as { career_event_option_id: CareerEventOption | null };
              // Preserve the full option including event
              return junction.career_event_option_id;
            }
            return opt as CareerEventOption;
          }).filter((opt): opt is CareerEventOption => opt !== null && opt !== undefined),
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

              <CompanyFormDialog onCreate={(newRow) => setData(prev => [newRow, ...prev])} />

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
                <Link href={`/company/${(company.name || "").toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "")}`}>
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
      const eventName = String(row.original.event?.name ?? "").toLowerCase();
      return name.includes(q) || description.includes(q) || eventName.includes(q);
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
      header: "Event",
      cell: ({ row }) => {
        const option = row.original;
        // Handle both direct event and nested event structure
        let eventName = "—";
        if (option.event) {
          if (typeof option.event === 'object' && 'name' in option.event) {
            eventName = String(option.event.name);
          } else if (typeof option.event === 'string') {
            // If event is just an ID, we can't display it without fetching
            eventName = "—";
          }
        }
        return <div className="font-medium">{eventName}</div>;
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

  // Fetch all events and extract all options
  React.useEffect(() => {
    let alive = true;
    fetchEventsAction()
      .then((events) => {
        if (!alive) return;
        // Extract all options from all events
        const options: CareerEventOption[] = [];
        (events ?? []).forEach((event: CareerEvent) => {
          if (event.options) {
            event.options.forEach((option) => {
              options.push({
                ...option,
                event: event,
              });
            });
          }
        });
        setAllOptions(options);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    return () => { alive = false; };
  }, []);

  // Filter out options that the company already has
  const availableOptions = React.useMemo(() => {
    const companyOptionIds = new Set((company.options ?? []).map(opt => opt.id));
    return allOptions.filter(opt => !companyOptionIds.has(opt.id));
  }, [allOptions, company.options]);

  // Filter options based on search query
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return availableOptions.slice(0, 50); // Show first 50 when no search
    const query = searchQuery.toLowerCase();
    return availableOptions.filter(opt => {
      const priceStr = typeof opt.price === 'string' ? opt.price : String(opt.price ?? '');
      return (
        opt.name.toLowerCase().includes(query) ||
        opt.event?.name?.toLowerCase().includes(query) ||
        (opt.description && stripHtml(opt.description).toLowerCase().includes(query)) ||
        priceStr.toLowerCase().includes(query)
      );
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
    setSearchQuery(`${option.name} - ${option.event?.name} (${priceStr})`);
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
                              {option.event?.name} - {priceStr}
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
function CompanyFormDialog({ onCreate }: { onCreate: (row: CompanyRow) => void }) {
  const [open, setOpen] = React.useState(false);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="ml-auto" variant="outline">
          <IconPlus /> Add Company
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
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
      </CardContent>
    </Card>
  );
}
