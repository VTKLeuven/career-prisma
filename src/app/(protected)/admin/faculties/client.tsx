"use client";

import { ResourceManager } from "@/components/admin/ResourceManager";
import type { ResourceConfig, SelectOption } from "@/components/admin/types";
import {
  createFacultyAction,
  updateFacultyAction,
  deleteFacultyAction,
} from "@/app/actions/faculties";
import type { Faculty, Master } from "@/lib/schema";

/** Pulls master ids out of the junction-wrapped `faculty.masters` array. */
function masterIdsOf(faculty: Faculty): string[] {
  return (faculty.masters ?? [])
    .map((item) => {
      if (item && typeof item === "object" && "master_id" in item) {
        const m = (item as { master_id: Master | null }).master_id;
        return m ? String(m.id) : null;
      }
      return item ? String((item as Master).id) : null;
    })
    .filter((v): v is string => Boolean(v));
}

/** Resolves master names for the table cell. */
function masterNamesOf(faculty: Faculty, byId: Map<string, string>): string {
  const ids = masterIdsOf(faculty);
  if (!ids.length) return "—";
  return ids.map((id) => byId.get(id) ?? id).join(", ");
}

export default function FacultiesClient({
  initialFaculties,
  masters,
}: {
  initialFaculties: Faculty[];
  masters: Master[];
}) {
  const masterOptions: SelectOption[] = masters.map((m) => ({
    value: String(m.id),
    label: m.name,
  }));
  const masterNameById = new Map(masterOptions.map((o) => [o.value, o.label]));

  const config: ResourceConfig<Faculty> = {
    singular: "Faculty",
    getId: (f) => String(f.id),
    getLabel: (f) => f.name,
    searchKeys: ["name"],
    columns: [
      {
        key: "logo",
        label: "Logo",
        render: (f) =>
          f.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/files/${f.logo}`}
              alt={f.name}
              className="h-8 w-8 rounded object-contain"
            />
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      { key: "name", label: "Name" },
      {
        key: "masters",
        label: "Masters",
        render: (f) => (
          <span className="text-sm text-muted-foreground">
            {masterNamesOf(f, masterNameById)}
          </span>
        ),
      },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "logo", label: "Logo", type: "image" },
      {
        name: "masterIds",
        label: "Masters",
        type: "multiselect",
        options: masterOptions,
        getEditValue: (f) => masterIdsOf(f),
        help: "Master programmes belonging to this faculty.",
      },
    ],
    actions: {
      create: createFacultyAction,
      update: updateFacultyAction,
      remove: deleteFacultyAction,
    },
  };

  return <ResourceManager config={config} initialRows={initialFaculties} />;
}
