"use client";

import * as React from "react";
import { ResourceManager } from "@/components/admin/ResourceManager";
import type { ResourceConfig, SelectOption } from "@/components/admin/types";
import { Button } from "@/components/ui/button";
import {
  createSubOptionAction,
  updateSubOptionAction,
  deleteSubOptionAction,
  createEventOptionAction,
  updateEventOptionAction,
  deleteEventOptionAction,
} from "@/app/actions/career-options";
import type { CareerSubOption, CareerEventOption, CareerEvent } from "@/lib/schema";

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

type Tab = "options" | "sub-options";

export default function CareerOptionsClient({
  initialSubOptions,
  initialOptions,
  events,
  subOptions,
}: {
  initialSubOptions: CareerSubOption[];
  initialOptions: CareerEventOption[];
  events: CareerEvent[];
  subOptions: CareerSubOption[];
}) {
  const [tab, setTab] = React.useState<Tab>("options");

  const eventOptions: SelectOption[] = events.map((e) => ({
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
      { name: "description", label: "Description", type: "textarea" },
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
      create: createEventOptionAction,
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
      { name: "description", label: "Description", type: "textarea" },
    ],
    actions: {
      create: createSubOptionAction,
      update: updateSubOptionAction,
      remove: deleteSubOptionAction,
    },
  };

  return (
    <div className="space-y-4">
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
      </div>

      {tab === "options" ? (
        <ResourceManager config={optionConfig} initialRows={initialOptions} />
      ) : (
        <ResourceManager config={subOptionConfig} initialRows={initialSubOptions} />
      )}
    </div>
  );
}
