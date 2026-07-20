import { getUserFromCookies } from "@/lib/auth-server";
import { listSpeakers } from "@/lib/repos/speakers";
import { listTimetables } from "@/lib/repos/timetable";
import SpeakersClient from "./client";

export default async function AdminSpeakersPage() {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;

  const [speakers, slots] = await Promise.all([
    listSpeakers({ limit: 1000 }),
    listTimetables({ limit: 1000 }),
  ]);

  const timeOptions = slots.map((s) => ({
    value: String(s.id),
    label:
      `${s.title ?? "Slot"}${
        s.start_time ? ` (${s.start_time}${s.end_time ? `–${s.end_time}` : ""})` : ""
      }`,
  }));

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Speakers</h1>
        <p className="text-muted-foreground">
          Manage jobfair speakers and link them to representatives and timeslots.
        </p>
      </div>
      <SpeakersClient initialSpeakers={speakers} timeOptions={timeOptions} />
    </div>
  );
}
