"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DataTable, RowDeleteButton } from "@/components/admin/DataTable";
import { confirmDialog } from "@/components/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import {
  fetchVacancyTypesAction,
  createVacancyTypeAction,
  updateVacancyTypeAction,
  deleteVacancyTypeAction,
  fetchVacancySectorsAction,
  createVacancySectorAction,
  updateVacancySectorAction,
  deleteVacancySectorAction,
  fetchVacancySectionConfigsAction,
  createVacancySectionConfigAction,
  updateVacancySectionConfigAction,
  deleteVacancySectionConfigAction,
  fetchVacancyAdminDataAction,
  updateVacancyAction,
  deleteVacancyAction,
} from "@/app/actions/vacancies";
import type {
  VacancyType,
  VacancySector,
  VacancySectionConfig,
  Vacancy,
  Company,
} from "@/lib/schema";
import { PageHeader } from "@/components/admin/PageHeader";

type Tab = "types" | "sectors" | "sections" | "vacancies";

const VACANCY_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

// ---------------------------------------------------------------------------
// Reusable CRUD table for simple name+sort+active items
// ---------------------------------------------------------------------------

function ConfigTable<T extends { id: string; name: string; sort?: number; active: boolean }>({
  items,
  onAdd,
  onUpdate,
  onDelete,
  extraColumns,
}: {
  items: T[];
  onAdd: (data: { name: string; sort: number; active: boolean } & Record<string, any>) => Promise<void>;
  onUpdate: (id: string, data: Partial<T>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  extraColumns?: {
    header: string;
    render: (item: T) => React.ReactNode;
    editField?: (
      value: any,
      onChange: (v: any) => void
    ) => React.ReactNode;
    defaultValue?: any;
    key: string;
  }[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formSort, setFormSort] = useState(0);
  const [formActive, setFormActive] = useState(true);
  const [extraValues, setExtraValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditId(null);
    setFormName("");
    setFormSort(items.length + 1);
    setFormActive(true);
    const defaults: Record<string, any> = {};
    extraColumns?.forEach((c) => {
      if (c.editField) {
        defaults[c.key] = c.defaultValue ?? "";
      }
    });
    setExtraValues(defaults);
    setDialogOpen(true);
  };

  const openEdit = (item: T) => {
    setEditId(item.id);
    setFormName(item.name);
    setFormSort(item.sort ?? 0);
    setFormActive(item.active);
    const vals: Record<string, any> = {};
    extraColumns?.forEach((c) => {
      if (c.editField) {
        vals[c.key] = (item as any)[c.key] ?? c.defaultValue ?? "";
      }
    });
    setExtraValues(vals);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        name: formName,
        sort: formSort,
        active: formActive,
      };
      extraColumns?.forEach((c) => {
        if (c.editField) {
          payload[c.key] = extraValues[c.key];
        }
      });
      if (editId) {
        await onUpdate(editId, payload);
      } else {
        await onAdd(payload);
      }
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DataTable
        rows={items}
        columns={[
          { key: "name", label: "Name" },
          ...(extraColumns ?? []).map((c) => ({ key: c.key, label: c.header, render: c.render })),
          { key: "sort", label: "Sort", align: "right" as const },
          {
            key: "active",
            label: "Active",
            filter: true,
            render: (item: T) => (
              <Badge variant={item.active ? "success" : "muted"}>
                {item.active ? "Active" : "Inactive"}
              </Badge>
            ),
          },
        ]}
        getRowId={(item) => item.id}
        noun="item"
        search={false}
        defaultSort={{ key: "sort" }}
        containerClassName=""
        onRowClick={openEdit}
        isRowSelected={(item) => dialogOpen && editId === item.id}
        rowActions={(item) => (
          <RowDeleteButton
            label={`Delete ${item.name}`}
            onClick={async () => {
              if (await confirmDialog({ title: `Delete "${item.name}"?`, description: "This action cannot be undone.", confirmLabel: "Delete", destructive: true })) {
                await onDelete(item.id);
              }
            }}
          />
        )}
        toolbar={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit" : "Add"} Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            {extraColumns?.map(
              (c) =>
                c.editField && (
                  <div key={c.key} className="space-y-2">
                    <Label>{c.header}</Label>
                    {c.editField(extraValues[c.key], (v) =>
                      setExtraValues((prev) => ({ ...prev, [c.key]: v }))
                    )}
                  </div>
                )
            )}
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={formSort}
                onChange={(e) => setFormSort(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formActive}
                onCheckedChange={setFormActive}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Admin Page
// ---------------------------------------------------------------------------

export default function AdminVacanciesPage() {
  const [tab, setTab] = useState<Tab>("types");
  const [types, setTypes] = useState<VacancyType[]>([]);
  const [sectors, setSectors] = useState<VacancySector[]>([]);
  const [sectionConfigs, setSectionConfigs] = useState<VacancySectionConfig[]>(
    []
  );
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const { types: t, sectors: s, sectionConfigs: sc, vacancies: v } = await fetchVacancyAdminDataAction();
    setTypes(t ?? []);
    setSectors(s ?? []);
    setSectionConfigs(sc ?? []);
    setVacancies(v ?? []);
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  // --------------- Types ---------------
  const handleAddType = async (data: any) => {
    await createVacancyTypeAction(data);
    const fresh = await fetchVacancyTypesAction(false);
    setTypes(fresh ?? []);
  };
  const handleUpdateType = async (id: string, data: any) => {
    await updateVacancyTypeAction(id, data);
    const fresh = await fetchVacancyTypesAction(false);
    setTypes(fresh ?? []);
  };
  const handleDeleteType = async (id: string) => {
    await deleteVacancyTypeAction(id);
    setTypes((prev) => prev.filter((t) => t.id !== id));
  };

  // --------------- Sectors ---------------
  const handleAddSector = async (data: any) => {
    await createVacancySectorAction(data);
    const fresh = await fetchVacancySectorsAction(false);
    setSectors(fresh ?? []);
  };
  const handleUpdateSector = async (id: string, data: any) => {
    await updateVacancySectorAction(id, data);
    const fresh = await fetchVacancySectorsAction(false);
    setSectors(fresh ?? []);
  };
  const handleDeleteSector = async (id: string) => {
    await deleteVacancySectorAction(id);
    setSectors((prev) => prev.filter((s) => s.id !== id));
  };

  // --------------- Section Configs ---------------
  const handleAddSection = async (data: any) => {
    await createVacancySectionConfigAction({
      label: data.name,
      sort: data.sort,
      active: data.active,
      required: data.required ?? false,
    });
    const fresh = await fetchVacancySectionConfigsAction(false);
    setSectionConfigs(fresh ?? []);
  };
  const handleUpdateSection = async (id: string, data: any) => {
    await updateVacancySectionConfigAction(id, {
      label: data.name,
      sort: data.sort,
      active: data.active,
      required: data.required,
    });
    const fresh = await fetchVacancySectionConfigsAction(false);
    setSectionConfigs(fresh ?? []);
  };
  const handleDeleteSection = async (id: string) => {
    await deleteVacancySectionConfigAction(id);
    setSectionConfigs((prev) => prev.filter((s) => s.id !== id));
  };

  // --------------- Vacancies ---------------
  const handleUpdateVacancyStatus = async (
    id: string,
    status: string
  ) => {
    await updateVacancyAction(id, { status: status as any });
    setVacancies((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: status as any } : v))
    );
  };
  const handleDeleteVacancy = async (id: string) => {
    await deleteVacancyAction(id);
    setVacancies((prev) => prev.filter((v) => v.id !== id));
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "types", label: "Types" },
    { id: "sectors", label: "Sectors" },
    { id: "sections", label: "Text Sections" },
    { id: "vacancies", label: "All Vacancies" },
  ];

  // Map section configs for the ConfigTable (it expects name, but sections have key+label)
  const sectionItemsForTable = sectionConfigs.map((sc) => ({
    ...sc,
    name: sc.label,
  }));

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        title="Vacancy Configuration"
        description="Manage vacancy types, sectors, text sections, and view all vacancies."
      />

      {/* Tabs */}
      <div className="scrollbar-hide flex gap-1 overflow-x-auto border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? "border-vtk-blue text-vtk-blue"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : (
        <>
          {tab === "types" && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Vacancy Types</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Examples: internship, job, student job. Companies select one when
                posting a vacancy.
              </p>
              <ConfigTable
                items={types}
                onAdd={handleAddType}
                onUpdate={handleUpdateType}
                onDelete={handleDeleteType}
              />
            </div>
          )}

          {tab === "sectors" && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Vacancy Sectors</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Business sectors (IT, Consultancy, etc.). Companies can select
                one or more per vacancy.
                when posting.
              </p>
              <ConfigTable
                items={sectors}
                onAdd={handleAddSector}
                onUpdate={handleUpdateSector}
                onDelete={handleDeleteSector}
              />
            </div>
          )}

          {tab === "sections" && (
            <div>
              <h2 className="text-lg font-semibold mb-2">
                Text Section Configuration
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Define which rich-text sections appear on the vacancy form.
                Each active section becomes a TipTap editor for companies and a
                rendered block on the public detail page. The &quot;Name&quot;
                field is the display label.
              </p>
              <ConfigTable
                items={sectionItemsForTable}
                onAdd={handleAddSection}
                onUpdate={handleUpdateSection}
                onDelete={handleDeleteSection}
                extraColumns={[
                  {
                    key: "required",
                    header: "Required",
                    render: (item: any) =>
                      item.required ? (
                        <Badge className="bg-blue-100 text-blue-800">
                          Required
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          Optional
                        </span>
                      ),
                    editField: (value, onChange) => (
                      <div className="flex items-center gap-2">
                        <Switch checked={!!value} onCheckedChange={onChange} />
                        <span className="text-sm">
                          {value ? "Required" : "Optional"}
                        </span>
                      </div>
                    ),
                    defaultValue: false,
                  },
                ]}
              />
            </div>
          )}

          {tab === "vacancies" && (
            <div>
              <h2 className="text-lg font-semibold mb-2">All Vacancies</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Overview of all vacancies across all companies. You can change
                status or delete entries.
              </p>
              <DataTable
                rows={vacancies}
                columns={[
                  { key: "title", label: "Title" },
                  {
                    key: "company",
                    label: "Company",
                    value: (v) => (typeof v.company === "object" ? (v.company as Company).name : v.company),
                    filter: true,
                  },
                  {
                    key: "type",
                    label: "Type",
                    value: (v) => (typeof v.type === "object" ? (v.type as VacancyType).name : v.type),
                    filter: true,
                  },
                  {
                    key: "status",
                    label: "Status",
                    filter: { options: VACANCY_STATUS_OPTIONS },
                    render: (v) => (
                      <Select
                        value={v.status}
                        onValueChange={(val) => handleUpdateVacancyStatus(v.id, val)}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VACANCY_STATUS_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ),
                  },
                  {
                    key: "date_created",
                    label: "Date",
                    value: (v) => new Date(v.date_created),
                    render: (v) => new Date(v.date_created).toLocaleDateString("en-GB"),
                  },
                ]}
                getRowId={(v) => String(v.id)}
                noun="vacancy"
                nounPlural="vacancies"
                defaultSort={{ key: "date_created", desc: true }}
                rowActions={(v) => (
                  <RowDeleteButton
                    label={`Delete ${v.title}`}
                    onClick={async () => {
                      if (await confirmDialog({ title: `Delete "${v.title}"?`, description: "This will permanently delete this vacancy.", confirmLabel: "Delete", destructive: true })) {
                        await handleDeleteVacancy(v.id);
                      }
                    }}
                  />
                )}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
