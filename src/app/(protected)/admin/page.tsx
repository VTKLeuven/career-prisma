"use client";

import * as React from "react";
import { fetchCompaniesAction, createCompanyAction } from "@/app/actions/companies";
import { fetchEventsAction } from "@/app/actions/events";
import { fetchSalespersonsAction } from "@/app/actions/salespeople";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
} from "@tanstack/react-table";
import { ChevronDown, MoreHorizontal } from "lucide-react";

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
import type { CareerEvent, Company } from "@/lib/schema";
import { useUser } from "@/providers/UserProvider";
import { DirectusUser } from "@directus/sdk";

/** ------------------------------------------------------------------
 * Companies section
 * ------------------------------------------------------------------ */

type CompanyRow = Pick<Company, "id" | "name" | "VAT" | "address" | "salesperson">;

const companyColumns: ColumnDef<CompanyRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
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
    cell: ({ row }) => <div className="capitalize">{row.getValue("name") as string}</div>,
    enableColumnFilter: true,
  },
  {
    accessorKey: "VAT",
    header: "VAT",
    cell: ({ row }) => <div className="font-mono text-xs">{row.getValue("VAT") as string}</div>,
    enableColumnFilter: true,
  },
  {
    accessorKey: "address",
    header: "Address",
    cell: ({ row }) => <div className="truncate max-w-[32ch]">{row.getValue("address") as string}</div>,
  },
  {
    accessorKey: "salesperson",
    header: () => <div className="text-right">Assignee</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">{String(row.getValue("salesperson") ?? "").trim() || "—"}</div>
    ),
    enableColumnFilter: true,
    filterFn: (row, id, value: string) => {
      if (!value) return true; // "All"
      return String(row.getValue(id) ?? "") === value;
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const company = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => console.log("Users for", company.id)}>View users</DropdownMenuItem>
            <DropdownMenuItem onClick={() => console.log("Company", company.id)}>View company page</DropdownMenuItem>
            <DropdownMenuItem onClick={() => console.log("Vacancies for", company.id)}>View vacancies</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => console.log("Edit", company.id)}>Edit Company</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

function CompaniesSection() {
  const [data, setData] = React.useState<CompanyRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  React.useEffect(() => {
    let alive = true;
    fetchCompaniesAction()
      .then((rows) => {
        if (!alive) return;
        // Ensure the table gets exactly the fields it expects
        const mapped: CompanyRow[] = (rows ?? []).map((r: Company) => ({
          id: r.id,
          name: r.name,
          VAT: r.VAT ?? "",
          address: r.address ?? formatAddress(r),
          salesperson: r.salesperson ?? "",
        }));
        setData(mapped);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const table = useReactTable({
    data,
    columns: companyColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    // search over specific columns (name + VAT)
    globalFilterFn: (row, _columnId, filterValue) => {
      if (!filterValue) return true;
      const q = String(filterValue).toLowerCase();
      const name = String(row.getValue("name") ?? "").toLowerCase();
      const vat = String(row.getValue("VAT") ?? "").toLowerCase();
      return name.includes(q) || vat.includes(q);
    },
  });

  const salespersonOptions = React.useMemo(
    () => Array.from(new Set((data ?? []).map((d) => d.salesperson).filter(Boolean))).sort() as string[],
    [data]
  );

  return (
    <Card className="rounded-2xl shadow-md">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-2xl">Manage Companies</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            placeholder="Filter companies..."
            value={table.getState().globalFilter ?? ""}
            onChange={(event) => table.setGlobalFilter(event.target.value)}
            className="max-w-sm"
          />
          <Select
            value={(table.getColumn("salesperson")?.getFilterValue() as string) ?? ""}
            onValueChange={(val) => table.getColumn("salesperson")?.setFilterValue(val === "__all__" ? undefined : val)}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter on salesperson" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem key="__all__" value="__all__">All</SelectItem>
              {salespersonOptions.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <CompanyFormDialog onCreate={(newRow) => setData((prev) => [newRow, ...prev])} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <IconColumns />
                Columns <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={companyColumns.length} className="h-24 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={companyColumns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-2 flex items-center justify-end space-x-2">
          <div className="text-muted-foreground flex-1 text-sm">
            {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="space-x-2">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Add Company Dialog (controlled) */
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

    const newRep: Partial<DirectusUser> = {
      first_name: firstName,
      last_name: lastName,
      email: email,
      role: "d5475bf4-a77f-48de-b06c-fac199b0f631",
      status: "invited"
    }

    // TODO MATTHIJS: call a server action to persist (create Company + create User and relate)
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
                  First Name*
                </Label>
                <Input name="firstName" id="firstName" placeholder="Wannes" required />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-xs">
                  Last Name*
                </Label>
                <Input name="lastName" id="lastName" placeholder="Huygh" required />
              </div>
            </div>
            <div className="w-full">
              <Label htmlFor="email" className="text-xs">
                Email*
              </Label>
              <div className="relative">
                <Input name="email" id="email" type="email" placeholder="wannes.huygh@vtk.be" className="pl-10" required />
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
              <div className="flex gap-2">
                <Button type="submit" disabled={!salesperson}>Save</Button>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
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

function formatAddress(r: Company) {
  const parts = [
    r.address_street && `${r.address_street} ${r.address_number ?? ""}`.trim(),
    r.address_zip && `${r.address_zip} ${r.address_city ?? ""}`.trim(),
    r.address_country,
  ].filter(Boolean);
  return parts.join(", ");
}

/** ------------------------------------------------------------------
 * Events section
 * ------------------------------------------------------------------ */

function EventsSection() {
  const [events, setEvents] = React.useState<CareerEvent[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    fetchEventsAction()
      .then((rows) => {
        if (!alive) return;
        setEvents(rows ?? []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
    return () => {
      alive = false;
    };
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <EventCard key={event.id ?? event.name} event={event} />
            ))}
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
        {event.description ? (
          <CardDescription>
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: String(event.description) }} />
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-1 text-sm text-muted-foreground">
        <span>Date</span>
        <span className="font-medium text-foreground">{String(event.date ?? "TBA")}</span>
        <span>Hours</span>
        <span className="font-medium text-foreground">{hours || "TBA"}</span>
        <span>Location</span>
        <span className="font-medium text-foreground">{String(event.location ?? "TBA")}</span>
        <span># Students</span>
        <span className="font-medium text-foreground">{String(event.num_of_students ?? "–")}</span>
      </CardContent>
    </Card>
  );
}

/** ------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------ */

export default function AdminPage() {
  const {user} = useUser();
  if (!user?.admin) {
    return <p>NO ACCESS</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <CompaniesSection />
      <EventsSection />
    </div>
  );
}
