"use client";

import { ResourceManager } from "@/components/admin/ResourceManager";
import type { ResourceConfig, SelectOption } from "@/components/admin/types";
import {
  createTimetableAction,
  updateTimetableAction,
  deleteTimetableAction,
} from "@/app/actions/timetables";
import type { TimeSlot } from "@/lib/schema";

const TYPE_OPTIONS: SelectOption[] = [
  { value: "student", label: "Student" },
  { value: "company", label: "Company" },
  { value: "discovery", label: "Discovery" },
];

export default function TimetableClient({
  initialSlots,
  speakerOptions,
}: {
  initialSlots: TimeSlot[];
  speakerOptions: SelectOption[];
}) {
  const speakerLabelById = new Map(speakerOptions.map((o) => [o.value, o.label]));

  const config: ResourceConfig<TimeSlot> = {
    singular: "Slot",
    getId: (s) => String(s.id),
    getLabel: (s) => s.title,
    searchKeys: ["title"],
    columns: [
      { key: "title", label: "Title" },
      {
        key: "time",
        label: "Time",
        render: (s) =>
          [s.start_time, s.end_time].filter(Boolean).join(" – ") || "—",
      },
      {
        key: "type",
        label: "Type",
        render: (s) =>
          Array.isArray(s.type) && s.type.length ? (
            <span className="flex flex-wrap gap-1">
              {s.type.map((t) => (
                <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-xs capitalize">
                  {t}
                </span>
              ))}
            </span>
          ) : (
            "—"
          ),
      },
      {
        key: "speaker",
        label: "Speaker",
        render: (s) =>
          s.speaker?.id ? speakerLabelById.get(String(s.speaker.id)) ?? "—" : "—",
      },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "start_time", label: "Start time", type: "time" },
      { name: "end_time", label: "End time", type: "time" },
      { name: "icon", label: "Icon", type: "text", placeholder: "Icon name (optional)" },
      { name: "type", label: "Type", type: "multiselect", options: TYPE_OPTIONS },
      {
        name: "speaker_id",
        label: "Speaker",
        type: "select",
        options: speakerOptions,
        getEditValue: (s) => (s.speaker?.id ? String(s.speaker.id) : ""),
      },
    ],
    actions: {
      create: createTimetableAction,
      update: updateTimetableAction,
      remove: deleteTimetableAction,
    },
  };

  return <ResourceManager config={config} initialRows={initialSlots} />;
}
