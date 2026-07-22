"use client";

import * as React from "react";
import { ResourceManager } from "@/components/admin/ResourceManager";
import type { ResourceConfig, SelectOption } from "@/components/admin/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createSubOptionAction,
  updateSubOptionAction,
  deleteSubOptionAction,
  createEventOptionAction,
  updateEventOptionAction,
  deleteEventOptionAction,
} from "@/app/actions/career-options";
import type { CareerSubOption, CareerEventOption, CareerEvent } from "@/lib/schema";
import type { AcademicYear } from "@/lib/schema";
import type { AdminOptionSale } from "@/lib/repos/option-sales";
import {
  copyAnnualCatalogAction,
  createAcademicYearAction,
  createCatalogSaleAction,
  deleteOptionSaleAction,
} from "@/app/actions/annual-catalog";

/** Strips HTML tags for a plain-text table preview. */
function stripHtml(html?: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Pulls event ids out of the junction-wrapped `option.events` array. */
function eventIdsOf(option: CareerEventOption): string[] {
  return (option.events ?? [])
    .map((item) => {
      if (item && typeof item === "object" && "career_event_id" in item) {
        const e = (item as { career_event_id: CareerEvent | null }).career_event_id;
        return e ? String(e.id) : null;
      }
      return item ? String((item as CareerEvent).id) : null;
    })
    .filter((v): v is string => Boolean(v));
}

/** Pulls sub-option ids out of the junction-wrapped `option.sub_options` array. */
function subOptionIdsOf(option: CareerEventOption): string[] {
  return (option.sub_options ?? [])
    .map((item) => {
      if (item && typeof item === "object" && "career_sub_option_id" in item) {
        const s = (item as { career_sub_option_id: CareerSubOption | null }).career_sub_option_id;
        return s ? String(s.id) : null;
      }
      return item ? String((item as CareerSubOption).id) : null;
    })
    .filter((v): v is string => Boolean(v));
}

type Tab = "options" | "sub-options" | "sales";

export default function CareerOptionsClient({
  initialSubOptions,
  initialOptions,
  events,
  subOptions,
  academicYears,
  currentAcademicYearId,
  sales,
  companies,
}: {
  initialSubOptions: CareerSubOption[];
  initialOptions: CareerEventOption[];
  events: CareerEvent[];
  subOptions: CareerSubOption[];
  academicYears: AcademicYear[];
  currentAcademicYearId: string;
  sales: AdminOptionSale[];
  companies: SelectOption[];
}) {
  const [tab, setTab] = React.useState<Tab>("options");
  const [selectedYearId, setSelectedYearId] = React.useState(
    currentAcademicYearId || String(academicYears[0]?.id ?? "")
  );
  const [copySourceYearId, setCopySourceYearId] = React.useState("");
  const [copying, setCopying] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [yearDialogOpen, setYearDialogOpen] = React.useState(false);
  const [yearName, setYearName] = React.useState("");
  const [yearStart, setYearStart] = React.useState("");
  const [yearEnd, setYearEnd] = React.useState("");
  const [creatingYear, setCreatingYear] = React.useState(false);
  const router = useRouter();

  const yearOptions: SelectOption[] = academicYears.map((year) => ({
    value: String(year.id),
    label: year.name,
  }));
  const yearOf = (value: CareerEvent | CareerEventOption) =>
    String(
      value.academic_year_id
      ?? (value.academic_year && typeof value.academic_year === "object" ? value.academic_year.id : "")
    );
  const visibleOptions = initialOptions.filter((option) => yearOf(option) === selectedYearId);
  const visibleEvents = events.filter((event) => yearOf(event) === selectedYearId);
  const selectedYear = academicYears.find((year) => String(year.id) === selectedYearId);
  const isPastYear = selectedYear?.end_of_year
    ? new Date(selectedYear.end_of_year).getTime() < Date.now()
    : false;

  const eventOptions: SelectOption[] = visibleEvents.map((e) => ({
    value: String(e.id),
    label: e.name ?? "(untitled event)",
  }));
  const subOptionOptions: SelectOption[] = subOptions.map((s) => ({
    value: String(s.id),
    label: s.name,
  }));
  const eventNameById = new Map(eventOptions.map((o) => [o.value, o.label]));

  const optionConfig: ResourceConfig<CareerEventOption> = {
    singular: "Option",
    readOnly: isPastYear,
    getId: (o) => String(o.id),
    getLabel: (o) => o.name,
    searchKeys: ["name"],
    columns: [
      { key: "name", label: "Name" },
      {
        key: "price",
        label: "Price",
        render: (o) => (o.price != null && String(o.price) !== "" ? `€${o.price}` : "—"),
      },
      {
        key: "events",
        label: "Events",
        render: (o) => {
          const names = eventIdsOf(o).map((id) => eventNameById.get(id) ?? id);
          return (
            <span className="text-sm text-muted-foreground">
              {names.length ? names.join(", ") : "—"}
            </span>
          );
        },
      },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "price", label: "Price (€)", type: "number" },
      { name: "description", label: "Description", type: "richtext" },
      {
        name: "eventIds",
        label: "Events",
        type: "multiselect",
        options: eventOptions,
        getEditValue: (o) => eventIdsOf(o),
        help: "Career events this option is offered at.",
      },
      {
        name: "subOptionIds",
        label: "Sub-options",
        type: "multiselect",
        options: subOptionOptions,
        getEditValue: (o) => subOptionIdsOf(o),
      },
    ],
    actions: {
      create: (data) => createEventOptionAction({ ...data, academic_year_id: selectedYearId }),
      update: updateEventOptionAction,
      remove: deleteEventOptionAction,
    },
  };

  const subOptionConfig: ResourceConfig<CareerSubOption> = {
    singular: "Sub-option",
    getId: (s) => String(s.id),
    getLabel: (s) => s.name,
    searchKeys: ["name"],
    columns: [
      { key: "name", label: "Name" },
      { key: "price", label: "Price", render: (s) => s.price || "—" },
      {
        key: "description",
        label: "Description",
        render: (s) => (
          <span className="block max-w-[40ch] truncate text-sm text-muted-foreground">
            {stripHtml(s.description) || "—"}
          </span>
        ),
      },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "price", label: "Price", type: "text", placeholder: "e.g. 500 or Free" },
      { name: "description", label: "Description", type: "richtext" },
    ],
    actions: {
      create: createSubOptionAction,
      update: updateSubOptionAction,
      remove: deleteSubOptionAction,
    },
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-md border bg-muted/20 p-4 lg:flex-row lg:items-end">
        <div className="space-y-2">
          <Label>Academic year</Label>
          <div className="flex gap-2">
            <Select value={selectedYearId} onValueChange={setSelectedYearId}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Select an academic year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year.value} value={year.value}>{year.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={() => setYearDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Year
            </Button>
          </div>
        </div>
        <div className="space-y-2 lg:ml-auto">
          <Label>Start from a previous year</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={copySourceYearId} onValueChange={setCopySourceYearId}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Choose source year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.filter((year) => year.value !== selectedYearId).map((year) => (
                  <SelectItem key={year.value} value={year.value}>{year.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              disabled={!copySourceYearId || !selectedYearId || copying || isPastYear}
              onClick={async () => {
                if (!confirm("Copy events and options into the selected year? Company sales will not be copied.")) return;
                setCopying(true);
                setMessage(null);
                const result = await copyAnnualCatalogAction(copySourceYearId, selectedYearId);
                setCopying(false);
                if (!result.success) return setMessage(result.error ?? "Copy failed");
                setMessage(`${result.data?.eventsCreated ?? 0} events and ${result.data?.optionsCreated ?? 0} options copied.`);
                router.refresh();
              }}
            >
              {copying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Copy catalog
            </Button>
          </div>
        </div>
      </div>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      {isPastYear ? (
        <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          This academic year is historical and read-only.
        </p>
      ) : null}

      <div className="inline-flex rounded-md border p-1 bg-muted/40 gap-1">
        <Button
          type="button"
          size="sm"
          variant={tab === "options" ? "default" : "ghost"}
          onClick={() => setTab("options")}
        >
          Options
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === "sub-options" ? "default" : "ghost"}
          onClick={() => setTab("sub-options")}
        >
          Sub-options
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === "sales" ? "default" : "ghost"}
          onClick={() => setTab("sales")}
        >
          Sales history
        </Button>
      </div>

      {tab === "options" ? (
        <ResourceManager config={optionConfig} initialRows={visibleOptions} />
      ) : tab === "sub-options" ? (
        <ResourceManager config={subOptionConfig} initialRows={initialSubOptions} />
      ) : (
        <SalesHistory
          selectedYearId={selectedYearId}
          academicYears={academicYears}
          options={visibleOptions}
          subOptions={subOptions}
          companies={companies}
          sales={sales.filter((sale) => sale.academic_year_id === selectedYearId)}
        />
      )}

      <Dialog open={yearDialogOpen} onOpenChange={setYearDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add academic year</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={yearName} onChange={(event) => setYearName(event.target.value)} placeholder="2026–2027" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Starts</Label><Input type="date" value={yearStart} onChange={(event) => setYearStart(event.target.value)} /></div>
              <div className="space-y-2"><Label>Ends</Label><Input type="date" value={yearEnd} onChange={(event) => setYearEnd(event.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setYearDialogOpen(false)}>Cancel</Button>
            <Button type="button" disabled={!yearName || !yearStart || !yearEnd || creatingYear} onClick={async () => {
              setCreatingYear(true);
              setMessage(null);
              const result = await createAcademicYearAction({ name: yearName, startOfYear: yearStart, endOfYear: yearEnd });
              setCreatingYear(false);
              if (!result.success) return setMessage(result.error ?? "Failed to create academic year");
              setYearDialogOpen(false);
              setYearName(""); setYearStart(""); setYearEnd("");
              router.refresh();
            }}>
              {creatingYear ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add year
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SalesHistory({
  selectedYearId,
  academicYears,
  options,
  subOptions,
  companies,
  sales,
}: {
  selectedYearId: string;
  academicYears: AcademicYear[];
  options: CareerEventOption[];
  subOptions: CareerSubOption[];
  companies: SelectOption[];
  sales: AdminOptionSale[];
}) {
  const router = useRouter();
  const [companyId, setCompanyId] = React.useState("");
  const [catalogItem, setCatalogItem] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const year = academicYears.find((candidate) => String(candidate.id) === selectedYearId);
  const isPastYear = year?.end_of_year ? new Date(year.end_of_year).getTime() < Date.now() : false;

  return (
    <div className="space-y-4">
      {!isPastYear ? (
        <div className="grid gap-3 rounded-md border p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="space-y-2">
            <Label>Company</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
              <SelectContent>{companies.map((company) => <SelectItem key={company.value} value={company.value}>{company.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Option or sub-option</Label>
            <Select value={catalogItem} onValueChange={setCatalogItem}>
              <SelectTrigger><SelectValue placeholder="Select an item" /></SelectTrigger>
              <SelectContent>
                {options.map((option) => <SelectItem key={`option:${option.id}`} value={`option:${option.id}`}>{option.name} (€{option.price ?? 0})</SelectItem>)}
                {subOptions.map((option) => <SelectItem key={`sub-option:${option.id}`} value={`sub-option:${option.id}`}>{option.name} ({option.price || "—"})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button
            disabled={!companyId || !catalogItem || saving}
            onClick={async () => {
              setSaving(true);
              setError(null);
              const [kind, itemId] = catalogItem.split(":", 2) as ["option" | "sub-option", string];
              const result = await createCatalogSaleAction({ companyId, itemId, kind, academicYearId: selectedYearId });
              setSaving(false);
              if (!result.success) return setError(result.error ?? "Failed to record sale");
              setCompanyId("");
              setCatalogItem("");
              router.refresh();
            }}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Record sale
          </Button>
        </div>
      ) : (
        <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          This academic year is historical and read-only.
        </p>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Company</TableHead><TableHead>Type</TableHead><TableHead>Option</TableHead><TableHead>Events</TableHead><TableHead>Sold price</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {sales.length ? sales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell>{sale.company_name}</TableCell>
                <TableCell>{sale.kind === "option" ? "Package" : "Sub-option"}</TableCell>
                <TableCell>{sale.option_name}</TableCell>
                <TableCell>{sale.event_names.join(", ") || "—"}</TableCell>
                <TableCell>{sale.price_at_sale == null ? "—" : `€${sale.price_at_sale}`}</TableCell>
                <TableCell className="capitalize">{sale.status}</TableCell>
                <TableCell>{sale.date_created ? new Date(sale.date_created).toLocaleDateString("en-GB") : "—"}</TableCell>
                <TableCell className="text-right">
                  {!isPastYear && sale.status === "sold" ? <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={async () => {
                    if (!confirm("Cancel this sale? Its history will be retained.")) return;
                    await deleteOptionSaleAction(sale.id, sale.kind);
                    router.refresh();
                  }}><Trash2 className="h-4 w-4" /></Button> : null}
                </TableCell>
              </TableRow>
            )) : <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">No sales for this academic year.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
