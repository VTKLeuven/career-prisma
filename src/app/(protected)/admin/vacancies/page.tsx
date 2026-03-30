"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
  fetchAllVacanciesAction,
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

type Tab = "types" | "sectors" | "sections" | "vacancies";

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
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              {extraColumns?.map((c) => (
                <TableHead key={c.key}>{c.header}</TableHead>
              ))}
              <TableHead>Sort</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4 + (extraColumns?.length ?? 0)}
                  className="text-center text-muted-foreground py-8"
                >
                  No items yet.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  {extraColumns?.map((c) => (
                    <TableCell key={c.key}>{c.render(item)}</TableCell>
                  ))}
                  <TableCell>{item.sort ?? "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={item.active ? "default" : "secondary"}
                      className={
                        item.active
                          ? "bg-green-100 text-green-800"
                          : "bg-neutral-100 text-neutral-500"
                      }
                    >
                      {item.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete &quot;{item.name}&quot;?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDelete(item.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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

const statusColors: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  published: "bg-green-100 text-green-800",
  archived: "bg-neutral-100 text-neutral-600",
};

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
    const [t, s, sc, v] = await Promise.all([
      fetchVacancyTypesAction(false),
      fetchVacancySectorsAction(false),
      fetchVacancySectionConfigsAction(false),
      fetchAllVacanciesAction({ limit: 200 }),
    ]);
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
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Vacancy Configuration</h1>
        <p className="text-muted-foreground">
          Manage vacancy types, sectors, text sections, and view all vacancies.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
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
                Business sectors (IT, Consultancy, etc.). Companies select one
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
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vacancies.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-muted-foreground py-8"
                        >
                          No vacancies yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      vacancies.map((v) => {
                        const companyName =
                          typeof v.company === "object"
                            ? (v.company as Company).name
                            : v.company;
                        const typeName =
                          typeof v.type === "object"
                            ? (v.type as VacancyType).name
                            : v.type;

                        return (
                          <TableRow key={v.id}>
                            <TableCell className="font-medium">
                              {v.title}
                            </TableCell>
                            <TableCell>{companyName}</TableCell>
                            <TableCell>{typeName}</TableCell>
                            <TableCell>
                              <Select
                                value={v.status}
                                onValueChange={(val) =>
                                  handleUpdateVacancyStatus(v.id, val)
                                }
                              >
                                <SelectTrigger className="w-32 h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="draft">Draft</SelectItem>
                                  <SelectItem value="published">
                                    Published
                                  </SelectItem>
                                  <SelectItem value="archived">
                                    Archived
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {new Date(v.date_created).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete &quot;{v.title}&quot;?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete this vacancy.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteVacancy(v.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
