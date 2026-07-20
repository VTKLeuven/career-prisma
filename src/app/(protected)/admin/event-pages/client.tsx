"use client";

import { ResourceManager } from "@/components/admin/ResourceManager";
import type { ResourceConfig, SelectOption } from "@/components/admin/types";
import {
  createEventPageAction,
  updateEventPageAction,
  deleteEventPageAction,
} from "@/app/actions/event-pages";
import type { AdminEventPageRow } from "@/lib/repos/event-page";

const HEADER_BUTTON_OPTIONS: SelectOption[] = [
  { value: "floorplan", label: "Floorplan" },
  { value: "company_guide", label: "Company guide" },
  { value: "cv_upload", label: "CV upload" },
  { value: "matching_software", label: "Matching software" },
];

const STATUS_OPTIONS: SelectOption[] = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
];

export default function EventPagesClient({
  initialPages,
  eventOptions,
  floorplanOptions,
  companyOptions,
  speakerOptions,
  timetableOptions,
}: {
  initialPages: AdminEventPageRow[];
  eventOptions: SelectOption[];
  floorplanOptions: SelectOption[];
  companyOptions: SelectOption[];
  speakerOptions: SelectOption[];
  timetableOptions: SelectOption[];
}) {
  const config: ResourceConfig<AdminEventPageRow> = {
    singular: "Event Page",
    getId: (p) => p.id,
    getLabel: (p) => p.event_name ?? `Page #${p.id}`,
    searchKeys: ["event_name", "tagline", "shout"],
    columns: [
      { key: "event_name", label: "Event", render: (p) => p.event_name || "—" },
      {
        key: "status",
        label: "Status",
        render: (p) => (
          <span className={p.status === "published" ? "text-emerald-600" : "text-muted-foreground"}>
            {p.status}
          </span>
        ),
      },
      { key: "companies", label: "Companies", render: (p) => String(p.companyIds.length) },
      { key: "speakers", label: "Speakers", render: (p) => String(p.speakerIds.length) },
      { key: "slots", label: "Slots", render: (p) => String(p.timetableIds.length) },
    ],
    fields: [
      { name: "event_id", label: "Event", type: "select", options: eventOptions, required: true },
      { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, defaultValue: "draft" },
      { name: "shout", label: "Shout", type: "text" },
      { name: "tagline", label: "Tagline", type: "text" },
      { name: "description_EN", label: "Description", type: "textarea" },
      { name: "address", label: "Address", type: "text" },
      { name: "parking", label: "Parking", type: "text" },
      { name: "registration_link", label: "Registration link", type: "text" },
      { name: "latitude", label: "Latitude", type: "number" },
      { name: "longitude", label: "Longitude", type: "number" },
      { name: "floorplan_id", label: "Floorplan", type: "select", options: floorplanOptions },
      { name: "image", label: "Header image", type: "image" },
      { name: "company_guide", label: "Company guide (PDF)", type: "file" },
      { name: "header_buttons", label: "Header buttons", type: "multiselect", options: HEADER_BUTTON_OPTIONS },
      { name: "companyIds", label: "Companies", type: "multiselect", options: companyOptions },
      { name: "speakerIds", label: "Speakers", type: "multiselect", options: speakerOptions },
      { name: "timetableIds", label: "Timetable slots", type: "multiselect", options: timetableOptions },
    ],
    actions: {
      create: createEventPageAction,
      update: updateEventPageAction,
      remove: deleteEventPageAction,
    },
  };

  return <ResourceManager config={config} initialRows={initialPages} />;
}
