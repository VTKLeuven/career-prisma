"use client";

import { ResourceManager } from "@/components/admin/ResourceManager";
import type { ResourceConfig, SelectOption } from "@/components/admin/types";
import {
  createSpeakerAction,
  updateSpeakerAction,
  deleteSpeakerAction,
  listRepresentativeOptionsAction,
} from "@/app/actions/speakers";
import type { Speaker } from "@/lib/schema";

function stripHtml(html?: string | null): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function repName(s: Speaker): string {
  const rep = s.representative;
  if (!rep) return "—";
  return [rep.first_name, rep.last_name].filter(Boolean).join(" ") || "—";
}

export default function SpeakersClient({
  initialSpeakers,
  timeOptions,
}: {
  initialSpeakers: Speaker[];
  timeOptions: SelectOption[];
}) {
  const config: ResourceConfig<Speaker> = {
    singular: "Speaker",
    getId: (s) => String(s.id),
    getLabel: (s) => repName(s),
    columns: [
      { key: "representative", label: "Representative", render: (s) => repName(s) },
      {
        key: "time",
        label: "Timeslot",
        render: (s) => s.time?.title || (s.time?.start_time ?? "—"),
      },
      {
        key: "personal_information",
        label: "Bio",
        render: (s) => (
          <span className="block max-w-[40ch] truncate text-sm text-muted-foreground">
            {stripHtml(s.personal_information) || "—"}
          </span>
        ),
      },
    ],
    fields: [
      {
        name: "representative_id",
        label: "Representative",
        type: "select",
        loadOptions: listRepresentativeOptionsAction,
        getEditValue: (s) => (s.representative?.id ? String(s.representative.id) : ""),
        help: "The platform user who is speaking.",
      },
      {
        name: "time_id",
        label: "Timeslot",
        type: "select",
        options: timeOptions,
        getEditValue: (s) => (s.time?.id ? String(s.time.id) : ""),
      },
      { name: "personal_information", label: "Personal information", type: "richtext" },
      { name: "content", label: "Talk content", type: "richtext" },
    ],
    actions: {
      create: createSpeakerAction,
      update: updateSpeakerAction,
      remove: deleteSpeakerAction,
    },
  };

  return <ResourceManager config={config} initialRows={initialSpeakers} />;
}
