import Link from "next/link";
import { FileText, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { fetchSchedulesForEventAction } from "@/app/actions/schedules";

function BackToDashboard() {
  return (
    <Button asChild variant="outline" className="w-fit">
      <Link href="/dashboard">← Back to dashboard</Link>
    </Button>
  );
}

/**
 * The student schedules for one event, decided and loaded on the server. The
 * page used to fetch the company and every event, check access and the event
 * hours in the browser, then fetch the schedules -- behind a spinner.
 */
export default async function DashboardSchedulesPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const result = await fetchSchedulesForEventAction(eventId);

  if (result.status === "no_access") {
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
        <BackToDashboard />
      </div>
    );
  }

  if (result.status === "not_during_event") {
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
        <BackToDashboard />
      </div>
    );
  }

  const { eventName, schedules } = result;
  return (
    <div className="w-full gap-4 flex flex-col">
      <BackToDashboard />

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
