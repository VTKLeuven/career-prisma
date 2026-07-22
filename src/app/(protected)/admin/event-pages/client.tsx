"use client";

import * as React from "react";
import { ResourceManager } from "@/components/admin/ResourceManager";
import type { ResourceConfig, SelectOption } from "@/components/admin/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HeroiconSelector } from "@/components/admin/HeroiconSelector";
import { SimpleRichTextEditor } from "@/components/admin/SimpleRichTextEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import {
  createEventPageAction,
  updateEventPageAction,
  deleteEventPageAction,
} from "@/app/actions/event-pages";
import type {
  AdminEventPageRow,
  AdminEventPageTimetableItem,
} from "@/lib/repos/event-page";
import { compareTimetableItems, timetableTimeLabel } from "@/lib/utils/timetable";

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
  academicYears,
  currentAcademicYearId,
}: {
  initialPages: AdminEventPageRow[];
  eventOptions: Array<SelectOption & { academicYearId: string }>;
  floorplanOptions: SelectOption[];
  companyOptions: SelectOption[];
  speakerOptions: SelectOption[];
  academicYears: Array<SelectOption & { endOfYear?: string }>;
  currentAcademicYearId: string;
}) {
  const [selectedYearId, setSelectedYearId] = React.useState(
    currentAcademicYearId || academicYears[0]?.value || ""
  );
  const visiblePages = initialPages.filter((page) => page.academic_year_id === selectedYearId);
  const visibleEventOptions = eventOptions.filter((event) => event.academicYearId === selectedYearId);
  const selectedYear = academicYears.find((year) => year.value === selectedYearId);
  const isPastYear = selectedYear?.endOfYear
    ? new Date(selectedYear.endOfYear).getTime() < Date.now()
    : false;
  const config: ResourceConfig<AdminEventPageRow> = {
    singular: "Event Page",
    readOnly: isPastYear,
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
    dialogClassName: "sm:max-w-5xl h-[90dvh]",
    fieldsClassName: "grid grid-cols-1 gap-5 md:grid-cols-2",
    fields: [
      { name: "event_id", label: "Event", type: "select", options: visibleEventOptions, required: true, section: "Basics" },
      {
        name: "event_name",
        label: "Event name",
        type: "text",
        help: "Changing this updates the edition name. The stable public URL is retained for SEO.",
      },
      { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, defaultValue: "draft" },
      { name: "shout", label: "Shout", type: "text" },
      { name: "tagline", label: "Tagline", type: "text", className: "md:col-span-2" },
      { name: "description_EN", label: "Description", type: "richtext", className: "md:col-span-2" },
      { name: "address", label: "Address", type: "text", section: "Location & registration" },
      { name: "parking", label: "Parking", type: "text" },
      { name: "registration_link", label: "Registration link", type: "text", className: "md:col-span-2" },
      { name: "latitude", label: "Latitude", type: "number" },
      { name: "longitude", label: "Longitude", type: "number" },
      { name: "floorplan_id", label: "Floorplan", type: "select", options: floorplanOptions, section: "Media & navigation", className: "md:col-span-2" },
      { name: "image", label: "Header image", type: "image" },
      { name: "company_guide", label: "Company guide (PDF)", type: "file" },
      { name: "header_buttons", label: "Header buttons", type: "multiselect", options: HEADER_BUTTON_OPTIONS, className: "md:col-span-2" },
      { name: "companyIds", label: "Companies", type: "multiselect", options: companyOptions, section: "Participants" },
      { name: "speakerIds", label: "Speakers", type: "multiselect", options: speakerOptions },
      {
        name: "timetableItems",
        label: "Timetable elements",
        type: "multiselect",
        defaultValue: [],
        section: "Timetable",
        className: "md:col-span-2",
        getEditValue: (page) => page.timetableItems,
        help: "Timetable elements created here belong to this event page. Expand an element to edit its details.",
        renderInput: ({ value, onChange }) => (
          <TimetableElementsInput
            value={value}
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

  return (
    <div className="space-y-4">
      <div className="max-w-xs space-y-2">
        <Label>Academic year</Label>
        <Select value={selectedYearId} onValueChange={setSelectedYearId}>
          <SelectTrigger><SelectValue placeholder="Select academic year" /></SelectTrigger>
          <SelectContent>
            {academicYears.map((year) => (
              <SelectItem key={year.value} value={year.value}>{year.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ResourceManager config={config} initialRows={visiblePages} />
    </div>
  );
}

const TIMETABLE_TYPE_OPTIONS: SelectOption[] = [
  { value: "student", label: "Student" },
  { value: "company", label: "Company" },
  { value: "discovery", label: "Discovery" },
];

function TimetableElementsInput({
  value,
  speakerOptions,
  onChange,
}: {
  value: unknown;
  speakerOptions: SelectOption[];
  onChange: (value: unknown) => void;
}) {
  const selected = Array.isArray(value)
    ? (value as AdminEventPageTimetableItem[])
    : [];
  const sortedSelected = [...selected].sort(compareTimetableItems);
  const [expanded, setExpanded] = React.useState<string[]>([]);

  const update = (id: string, patch: Partial<AdminEventPageTimetableItem>) =>
    onChange(selected.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const add = () => {
    const id = `new-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
    onChange([
      ...selected,
      {
        id,
        title: "",
        description: "",
        start_time: "",
        end_time: "",
        icon: "",
        type: [],
        speaker_id: "",
      },
    ]);
    setExpanded((current) => [...current, id]);
  };

  const remove = (id: string) => {
    onChange(selected.filter((candidate) => candidate.id !== id));
    setExpanded((current) => current.filter((value) => value !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="mr-2 h-4 w-4" />
          Add timetable element
        </Button>
      </div>

      {selected.length ? (
        <Accordion
          type="multiple"
          value={expanded}
          onValueChange={setExpanded}
          className="space-y-2"
        >
          {sortedSelected.map((item) => (
            <AccordionItem key={item.id} value={item.id} className="rounded-md border px-4">
              <AccordionTrigger className="py-3 hover:no-underline">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                    {timetableTimeLabel(item)}
                  </span>
                  <span className="truncate">
                    {item.title.trim() || "Untitled timetable element"}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 border-t pt-4">
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input
                    aria-label="Timetable title"
                    value={item.title}
                    onChange={(event) => update(item.id, { title: event.target.value })}
                    placeholder="Title"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Description</Label>
                  <SimpleRichTextEditor
                    value={item.description}
                    onChange={(description) => update(item.id, { description })}
                    placeholder="Description"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Icon</Label>
                  <HeroiconSelector
                    value={item.icon}
                    onChange={(icon) => update(item.id, { icon })}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  aria-label={`Remove ${item.title || "timetable element"} from event page`}
                  onClick={() => remove(item.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove element
                </Button>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          No timetable elements yet. Add the first element for this event page.
        </p>
      )}
    </div>
  );
}
