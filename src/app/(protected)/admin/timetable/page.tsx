import { getUserFromCookies } from "@/lib/auth-server";
import { listTimetables } from "@/lib/repos/timetable";
import { listSpeakers } from "@/lib/repos/speakers";
import TimetableClient from "./client";

export default async function AdminTimetablePage() {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;

  const [slots, speakers] = await Promise.all([
    listTimetables({ limit: 1000 }),
    listSpeakers({ limit: 1000 }),
  ]);

  const speakerOptions = speakers.map((s) => ({
    value: String(s.id),
    label:
      [s.representative?.first_name, s.representative?.last_name]
        .filter(Boolean)
        .join(" ") || `Speaker #${s.id}`,
  }));

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Timetable</h1>
        <p className="text-muted-foreground">
          Manage timetable slots shown on event pages.
        </p>
      </div>
      <TimetableClient initialSlots={slots} speakerOptions={speakerOptions} />
    </div>
  );
}
