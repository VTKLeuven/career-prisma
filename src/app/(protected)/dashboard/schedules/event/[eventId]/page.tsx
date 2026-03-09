"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FileText, ChevronDown, Loader2 } from "lucide-react";
import { useUser } from "@/providers/UserProvider";
import { fetchCompanyByIdAction } from "@/app/actions/companies";
import { fetchSchedulesForEventAction } from "@/app/actions/schedules";
import { fetchEventsAction } from "@/app/actions/events";
import { getCompanySubOptionAnyStatus } from "@/lib/utils/company-access";
import { isDuringEvent } from "@/lib/utils/events";
import type { Company, CareerEvent } from "@/lib/schema";

export default function DashboardSchedulesPage() {
  const { user } = useUser();
  const params = useParams();
  const eventId = (Array.isArray(params?.eventId) ? params.eventId?.[0] : params?.eventId) as string | undefined;

  const [company, setCompany] = useState<Company | null>(null);
  const [schedules, setSchedules] = useState<Array<{ id: string; master?: { name?: string }; pdf?: { id?: string } }>>([]);
  const [eventName, setEventName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [accessState, setAccessState] = useState<"loading" | "no_access" | "not_during_event" | "ok">("loading");

  useEffect(() => {
    if (!eventId || !user?.company?.id) {
      setLoading(false);
      setAccessState("no_access");
      return;
    }

    const companyId = user.company.id;
    const evId = eventId;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setAccessState("loading");
      try {
        const [fetchedCompany, events] = await Promise.all([
          fetchCompanyByIdAction(companyId, false, true),
          fetchEventsAction(),
        ]);

        if (cancelled) return;

        if (!fetchedCompany) {
          setAccessState("no_access");
          return;
        }

        setCompany(fetchedCompany as Company);
        const hasAccess = getCompanySubOptionAnyStatus(fetchedCompany as Company, "Student Schedules") !== null;

        if (!hasAccess) {
          setAccessState("no_access");
          return;
        }

        const event = (events ?? []).find((e) => e.id === evId) as CareerEvent | undefined;
        if (event) setEventName(event.name ?? "");

        if (!event || !isDuringEvent(event)) {
          setAccessState("not_during_event");
          return;
        }

        setAccessState("ok");

        const list = await fetchSchedulesForEventAction(evId, fetchedCompany as Company);
        if (!cancelled) setSchedules(list);
      } catch (err) {
        console.error("[DashboardSchedulesPage]", err);
        if (!cancelled) setAccessState("no_access");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [eventId, user?.company?.id]);

  if (!eventId) {
    return (
      <div className="w-full gap-4 flex flex-col">
        <p className="text-muted-foreground">Event not found.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  if (!user?.company?.id) {
    return (
      <div className="w-full gap-4 flex flex-col">
        <p className="text-muted-foreground">No company associated with your account.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full gap-4 flex flex-col">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (accessState === "no_access") {
    return (
      <div className="w-full gap-4 flex flex-col">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold">No access</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your company does not have access to Student Schedules. Contact us if you believe this is an error.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/contact">Contact Us</Link>
            </Button>
          </CardContent>
        </Card>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/dashboard">← Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  if (accessState === "not_during_event") {
    return (
      <div className="w-full gap-4 flex flex-col">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold">Schedules not available</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Student schedules are only available during the event. Please come back when the event is taking place.
            </p>
          </CardContent>
        </Card>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/dashboard">← Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full gap-4 flex flex-col">
      <Button asChild variant="outline" className="w-fit">
        <Link href="/dashboard">← Back to dashboard</Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Student Schedules</CardTitle>
          <CardDescription>
            {eventName ? `Schedules for ${eventName}` : "View the schedules for the study programs you are interested in."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              No schedules available for your selected study programs.
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((s) => {
                const fileId = typeof s.pdf === "string" ? s.pdf : s.pdf?.id;
                const pdfUrl = fileId ? `/api/pdf-proxy?fileId=${fileId}` : null;
                const masterName = typeof s.master === "object" && s.master?.name ? s.master.name : "Schedule";
                return (
                  <Collapsible key={s.id} className="group/collapsible rounded-lg border overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 p-4 text-left hover:bg-neutral-50 transition-colors cursor-pointer"
                      >
                        <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                        <FileText className="h-5 w-5 text-vtk-blue shrink-0" />
                        <span className="font-medium">{masterName}</span>
                      </button>
                    </CollapsibleTrigger>
                    {pdfUrl && (
                      <CollapsibleContent>
                        <div className="border-t bg-white p-0 overflow-hidden">
                          <iframe
                            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
                            className="w-full border-0 block min-h-[1100px]"
                            title={masterName}
                          />
                        </div>
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
