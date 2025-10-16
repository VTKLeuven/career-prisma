"use client";

import * as React from "react";
import Image from 'next/image'
import { getDirectusImageUrl } from "@/lib/repos/directus";
import { fetchCompaniesAction } from "@/app/actions/companies";
import { fetchEventsAction } from "@/app/actions/events";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { ChevronDown, MoreHorizontal, Calendar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { IconBuilding, IconColumns, IconMail, IconPlus, IconTaxEuro } from "@tabler/icons-react";
import type { CareerEvent, Company } from "@/lib/schema";
import { useUser } from "@/providers/UserProvider";

function MyEventsSection() {
  const [events, setEvents] = React.useState<CareerEvent[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    fetchEventsAction()
      .then((rows) => {
        if (!alive) return;
        console.log(rows)
        setEvents(rows ?? []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="w-full gap-4 flex flex-col">
      <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Manage your events</h2>
      {loading ? (
        <div className="h-24 grid place-items-center text-sm text-muted-foreground">Loading events…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
          {events.map((event) => (
            <ManageEventCard key={event.id ?? event.name} event={event} />
          ))}
        </div>
      )}
      <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Discover our upcoming events</h2>
      {loading ? (
        <div className="h-24 grid place-items-center text-sm text-muted-foreground">Loading events…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {events.map((event) => (
            <EventCard key={event.id ?? event.name} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

function ManageEventCard({ event }: { event: CareerEvent }) {
  const hours = [event.start_hour, event.end_hour].filter(Boolean).join(" – ");
  return (
    <Card className="border rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle>{event.name}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="grid grid-cols-2 gap-1 text-sm text-muted-foreground">
          <span>Date</span>
          <span className="font-medium text-foreground">{String(event.date ?? "TBA")}</span>
          <span>Hours</span>
          <span className="font-medium text-foreground">{hours || "TBA"}</span>
          <span>Location</span>
          <span className="font-medium text-foreground">{String(event.location ?? "TBA")}</span>
          <span># Students</span>
          <span className="font-medium text-foreground">{String(event.num_of_students ?? "–")}</span>
        </div>
      </CardContent>
    </Card>
  );
}
function EventCard({ event }: { event: CareerEvent }) {
  const hours = [event.start_hour, event.end_hour].filter(Boolean).join(" – ");
  return (
    <div className="rounded-[28px] bg-white/90 p-3 shadow-[0_10px_40px_rgba(11,77,140,0.08)] ring-1 ring-black/5 backdrop-blur-md">
      <div className="relative overflow-hidden rounded-[20px]">
        <div className="aspect-[4/3]">
          {event.image && (
            <Image
              src={getDirectusImageUrl(event.image)!} // assert non-null if you trust the data
              alt={event.name}
              fill className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          )}
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>
      <div className="px-2 pb-2 pt-3">
        <div className="text-base font-semibold tracking-tight text-neutral-900">{event.name}</div>
        <div className="mt-1 flex items-center gap-2 text-sm text-neutral-700">
          <Calendar className="h-4 w-4 text-vtk-blue" />
          <span>{event.date} · {event.location}</span>
        </div>
      </div>
    </div>
  );
}

export default function DBLandingPage() {
  const { user } = useUser();
  if (!user?.admin) {
    return <p>NO ACCESS</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <MyEventsSection />
    </div>
  );
}
