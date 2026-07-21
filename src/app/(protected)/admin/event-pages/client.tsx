"use client";

import { ResourceManager } from "@/components/admin/ResourceManager";
import type { ResourceConfig, SelectOption } from "@/components/admin/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import {
  createEventPageAction,
  updateEventPageAction,
  deleteEventPageAction,
} from "@/app/actions/event-pages";
import type {
  AdminEventPageRow,
  AdminEventPageTimetableItem,
} from "@/lib/repos/event-page";

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
  timetableItems,
}: {
  initialPages: AdminEventPageRow[];
  eventOptions: SelectOption[];
  floorplanOptions: SelectOption[];
  companyOptions: SelectOption[];
  speakerOptions: SelectOption[];
  timetableItems: AdminEventPageTimetableItem[];
}) {
  const timetableById = new Map(timetableItems.map((item) => [item.id, item]));

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
      {
        name: "event_name",
        label: "Event name",
        type: "text",
        help: "Changing this also updates the event name and its public URL.",
      },
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
      {
        name: "timetableItems",
        label: "Timetable elements",
        type: "multiselect",
        defaultValue: [],
        getEditValue: (page) =>
          page.timetableIds
            .map((id) => page.timetableItems.find((item) => item.id === id) ?? timetableById.get(id))
            .filter((item): item is AdminEventPageTimetableItem => Boolean(item)),
        help: "Add existing elements, edit their content here, or remove them from this event page.",
        renderInput: ({ value, onChange }) => (
          <TimetableElementsInput
            value={value}
            availableItems={timetableItems}
            speakerOptions={speakerOptions}
            onChange={onChange}
          />
        ),
      },
    ],
    actions: {
      create: createEventPageAction,
      update: updateEventPageAction,
      remove: deleteEventPageAction,
    },
  };

  return <ResourceManager config={config} initialRows={initialPages} />;
}

const TIMETABLE_TYPE_OPTIONS: SelectOption[] = [
  { value: "student", label: "Student" },
  { value: "company", label: "Company" },
  { value: "discovery", label: "Discovery" },
];

function TimetableElementsInput({
  value,
  availableItems,
  speakerOptions,
  onChange,
}: {
  value: unknown;
  availableItems: AdminEventPageTimetableItem[];
  speakerOptions: SelectOption[];
  onChange: (value: unknown) => void;
}) {
  const selected = Array.isArray(value)
    ? (value as AdminEventPageTimetableItem[])
    : [];
  const selectedIds = new Set(selected.map((item) => item.id));
  const remaining = availableItems.filter((item) => !selectedIds.has(item.id));

  const update = (id: string, patch: Partial<AdminEventPageTimetableItem>) =>
    onChange(selected.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const add = (id: string) => {
    const item = availableItems.find((candidate) => candidate.id === id);
    if (item) onChange([...selected, { ...item, type: [...item.type] }]);
  };

  return (
    <div className="space-y-3">
      <Select value="" onValueChange={add}>
        <SelectTrigger>
          <SelectValue placeholder="Add a timetable element..." />
        </SelectTrigger>
        <SelectContent>
          {remaining.length ? (
            remaining.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {[item.start_time, item.title].filter(Boolean).join(" — ") || `Element #${item.id}`}
              </SelectItem>
            ))
          ) : (
            <SelectItem value="__none__" disabled>
              All timetable elements are already selected
            </SelectItem>
          )}
        </SelectContent>
      </Select>

      {selected.length ? (
        selected.map((item) => (
          <div key={item.id} className="space-y-3 rounded-md border p-3">
            <div className="flex items-center gap-2">
              <Input
                aria-label="Timetable title"
                value={item.title}
                onChange={(event) => update(item.id, { title: event.target.value })}
                placeholder="Title"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-destructive"
                aria-label={`Remove ${item.title || "timetable element"} from event page`}
                onClick={() => onChange(selected.filter((candidate) => candidate.id !== item.id))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <Textarea
              aria-label="Timetable description"
              value={item.description}
              onChange={(event) => update(item.id, { description: event.target.value })}
              placeholder="Description"
              rows={3}
            />

            <Input
              aria-label="Timetable icon"
              value={item.icon}
              onChange={(event) => update(item.id, { icon: event.target.value })}
              placeholder="Icon name (optional)"
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Start time</Label>
                <Input
                  type="time"
                  value={item.start_time}
                  onChange={(event) => update(item.id, { start_time: event.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>End time</Label>
                <Input
                  type="time"
                  value={item.end_time}
                  onChange={(event) => update(item.id, { end_time: event.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Speaker</Label>
              <Select
                value={item.speaker_id || "__none__"}
                onValueChange={(speakerId) =>
                  update(item.id, { speaker_id: speakerId === "__none__" ? "" : speakerId })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a speaker..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {speakerOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Visible for</Label>
              <div className="flex flex-wrap gap-3">
                {TIMETABLE_TYPE_OPTIONS.map((option) => {
                  const checked = item.type.includes(option.value);
                  return (
                    <label key={option.value} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) =>
                          update(item.id, {
                            type: next
                              ? [...item.type, option.value]
                              : item.type.filter((type) => type !== option.value),
                          })
                        }
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        ))
      ) : (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          No timetable elements selected.
        </p>
      )}
    </div>
  );
}
