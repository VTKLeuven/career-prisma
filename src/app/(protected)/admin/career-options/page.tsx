import { getUserFromCookies } from "@/lib/auth-server";
import { listCareerSubOptions, listCareerEventOptions } from "@/lib/repos/option";
import { listEvents } from "@/lib/repos/event";
import CareerOptionsClient from "./client";
import type { CareerEvent } from "@/lib/schema";

export default async function AdminCareerOptionsPage() {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;

  const [subOptions, options, events] = await Promise.all([
    listCareerSubOptions({ limit: 500 }),
    listCareerEventOptions({ limit: 1000 }),
    listEvents({ limit: 200, sort: "-date" }),
  ]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Career Options</h1>
        <p className="text-muted-foreground">
          Manage career event options and their sub-options.
        </p>
      </div>
      <CareerOptionsClient
        initialSubOptions={subOptions}
        initialOptions={options ?? []}
        events={(events ?? []) as CareerEvent[]}
        subOptions={subOptions}
      />
    </div>
  );
}
