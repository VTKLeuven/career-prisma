"use client";

import { ResourceManager } from "@/components/admin/ResourceManager";
import type { ResourceConfig } from "@/components/admin/types";
import {
  createMasterAction,
  updateMasterAction,
  deleteMasterAction,
} from "@/app/actions/masters";
import type { Master } from "@/lib/schema";

export default function MastersClient({ initialMasters }: { initialMasters: Master[] }) {
  const config: ResourceConfig<Master> = {
    singular: "Master",
    getId: (m) => String(m.id),
    getLabel: (m) => m.name,
    searchKeys: ["name", "short_name"],
    columns: [
      {
        key: "logo",
        label: "Logo",
        render: (m) =>
          m.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/files/${m.logo}`}
              alt={m.name}
              className="h-8 w-8 rounded object-contain"
            />
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      { key: "name", label: "Name" },
      { key: "short_name", label: "Short name" },
      {
        key: "students",
        label: "Students",
        render: (m) => (m.students != null ? String(m.students) : "—"),
      },
    ],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "short_name", label: "Short name", type: "text", placeholder: "e.g. CW" },
      { name: "logo", label: "Logo", type: "image" },
      { name: "students", label: "Number of students", type: "number" },
      {
        name: "modules",
        label: "Modules",
        type: "richtext",
        help: "Optional formatted description of the modules.",
      },
    ],
    actions: {
      create: createMasterAction,
      update: updateMasterAction,
      remove: deleteMasterAction,
    },
  };

  return <ResourceManager config={config} initialRows={initialMasters} />;
}
