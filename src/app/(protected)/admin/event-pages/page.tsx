import { getUserFromCookies } from "@/lib/auth-server";
import { listEventPagesAdmin, listFloorplansBasic } from "@/lib/repos/event-page";
import { listEvents } from "@/lib/repos/event";
import { listCompaniesBasic } from "@/lib/repos/company";
import { listSpeakers } from "@/lib/repos/speakers";
import { listTimetables } from "@/lib/repos/timetable";
import EventPagesClient from "./client";

export default async function AdminEventPagesPage() {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;

  const [pages, events, floorplans, companies, speakers, slots] = await Promise.all([
    listEventPagesAdmin(),
    listEvents({ limit: 200, sort: "-date" }),
    listFloorplansBasic(),
    listCompaniesBasic(),
    listSpeakers({ limit: 1000 }),
    listTimetables({ limit: 1000 }),
  ]);

  const eventOptions = (events ?? []).map((e) => ({ value: String(e.id), label: e.name ?? "(untitled)" }));
  const floorplanOptions = floorplans.map((f) => ({
    value: String(f.id),
    label: [f.name, f.year].filter(Boolean).join(" ") || `Floorplan #${f.id}`,
  }));
  const companyOptions = companies.map((c) => ({ value: c.id, label: c.name ?? "(unnamed)" }));
  const speakerOptions = speakers.map((s) => ({
    value: String(s.id),
    label:
      [s.representative?.first_name, s.representative?.last_name].filter(Boolean).join(" ") ||
      `Speaker #${s.id}`,
  }));
  const timetableOptions = slots.map((s) => ({
    value: String(s.id),
    label: s.title || `Slot #${s.id}`,
  }));

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Event Pages</h1>
        <p className="text-muted-foreground">
          Manage the public event pages and their companies, speakers and timetable.
        </p>
      </div>
      <EventPagesClient
        initialPages={pages}
        eventOptions={eventOptions}
        floorplanOptions={floorplanOptions}
        companyOptions={companyOptions}
        speakerOptions={speakerOptions}
        timetableOptions={timetableOptions}
      />
    </div>
  );
}
