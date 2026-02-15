"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { fetchEventsAction } from "@/app/actions/events";
import { fetchCompanyFormsForEventAction, checkCompanyFormCompletionByFormIdsBatchAction } from "@/app/actions/forms";
import { fetchCompaniesForEventAction } from "@/app/actions/companies";
import { getMatchingSoftwareForEventAction, getCompanyMatchingResponseCompletedIdsAction } from "@/app/actions/matching-software";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { CareerEvent } from "@/lib/schema";
import Link from "next/link";
import { useUser } from "@/providers/UserProvider";

type FormStatusItem = {
  formId: string;
  formName: string;
  formSlug: string;
  formVersionId: string;
  completed: boolean;
  isMatchingSoftware?: boolean;
  matchingSoftwareLink?: string;
};

type SalespersonInfo = { id: string; name: string } | null;

type CompanyFormStatus = {
  company: { id: string; name: string; status?: string };
  salesperson: SalespersonInfo;
  optionNames: string[];
  forms: FormStatusItem[];
  incompleteCount: number;
};

type SortOption = "incomplete" | "name-asc" | "name-desc";

export default function CompanyFormCompletionPage() {
  const { user } = useUser();
  const [events, setEvents] = useState<CareerEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [companyStatuses, setCompanyStatuses] = useState<CompanyFormStatus[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("incomplete");
  const [salespersonFilter, setSalespersonFilter] = useState<string>("all");

  useEffect(() => {
    fetchEventsAction()
      .then((eventsData) => {
        setEvents(eventsData || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading events:", err);
        setLoading(false);
      });
  }, []);

  const loadCompanyFormStatus = async () => {
    if (!selectedEventId) return;

    setLoadingStatus(true);
    try {
      // Fetch companies (with options) and matching software in parallel
      const [companies, matchingSoftware] = await Promise.all([
        fetchCompaniesForEventAction(selectedEventId, false),
        getMatchingSoftwareForEventAction(selectedEventId),
      ]);

      if (companies.length === 0) {
        setCompanyStatuses([]);
        setLoadingStatus(false);
        return;
      }

      // Extract option IDs that are linked to THIS event only (forms are assigned through options)
      const getOptionIdsForEvent = (company: { options?: unknown[] }) => {
        return (company.options ?? [])
          .filter((opt) => {
            if (!opt || typeof opt !== "object") return false;
            const optionWithEvents =
              "career_event_option_id" in opt
                ? (opt as { career_event_option_id?: unknown }).career_event_option_id
                : opt;
            if (!optionWithEvents) return false;
            const events = (optionWithEvents as { events?: unknown[]; event?: unknown }).events;
            const event = (optionWithEvents as { event?: unknown }).event;
            if (Array.isArray(events)) {
              return events.some((eventRef: unknown) => {
                const e = eventRef && typeof eventRef === "object" && "career_event_id" in eventRef
                  ? (eventRef as { career_event_id: unknown }).career_event_id
                  : eventRef;
                const id = typeof e === "string" ? e : (e && typeof e === "object" && "id" in e) ? (e as { id: string }).id : null;
                return String(id) === String(selectedEventId);
              });
            }
            if (event) {
              const id = typeof event === "string" ? event : (event && typeof event === "object" && "id" in event) ? (event as { id: string }).id : null;
              return String(id) === String(selectedEventId);
            }
            return false;
          })
          .map((opt) => {
            if (typeof opt === "string") return String(opt);
            if (opt && typeof opt === "object") {
              if ("career_event_option_id" in opt) {
                const ref = (opt as { career_event_option_id?: unknown }).career_event_option_id;
                if (typeof ref === "string") return ref;
                if (typeof ref === "number") return String(ref);
                if (ref && typeof ref === "object" && "id" in ref) return String((ref as { id: unknown }).id);
              }
              if ("id" in opt) return String((opt as { id: unknown }).id);
            }
            return null;
          })
          .filter((id): id is string => id !== null && id !== "");
      };

      // Group companies by option set - fetch forms once per unique option set (parallel)
      const optionSetToForms = new Map<string, Awaited<ReturnType<typeof fetchCompanyFormsForEventAction>>>();
      const getSalespersonInfo = (company: { salesperson?: unknown }): SalespersonInfo => {
        const sp = company.salesperson;
        if (!sp) return null;
        if (typeof sp === "string") return { id: sp, name: sp };
        if (sp && typeof sp === "object" && "id" in sp) {
          const first = (sp as { first_name?: string | null }).first_name ?? "";
          const last = (sp as { last_name?: string | null }).last_name ?? "";
          const name = [first, last].filter(Boolean).join(" ").trim() || (sp as { id: string }).id;
          return { id: (sp as { id: string }).id, name };
        }
        return null;
      };

      const getOptionNamesForEvent = (company: { options?: unknown[] }): string[] => {
        return (company.options ?? [])
          .filter((opt) => {
            if (!opt || typeof opt !== "object") return false;
            const optionWithEvents =
              "career_event_option_id" in opt
                ? (opt as { career_event_option_id?: unknown }).career_event_option_id
                : opt;
            if (!optionWithEvents) return false;
            const events = (optionWithEvents as { events?: unknown[]; event?: unknown }).events;
            const event = (optionWithEvents as { event?: unknown }).event;
            if (Array.isArray(events)) {
              return events.some((eventRef: unknown) => {
                const e = eventRef && typeof eventRef === "object" && "career_event_id" in eventRef
                  ? (eventRef as { career_event_id: unknown }).career_event_id
                  : eventRef;
                const id = typeof e === "string" ? e : (e && typeof e === "object" && "id" in e) ? (e as { id: string }).id : null;
                return String(id) === String(selectedEventId);
              });
            }
            if (event) {
              const id = typeof event === "string" ? event : (event && typeof event === "object" && "id" in event) ? (event as { id: string }).id : null;
              return String(id) === String(selectedEventId);
            }
            return false;
          })
          .map((opt: unknown) => {
            const o = opt as Record<string, unknown>;
            const ref = "career_event_option_id" in o ? o.career_event_option_id : o;
            if (ref && typeof ref === "object" && ref !== null && "name" in ref) {
              return String((ref as { name: string }).name).trim();
            }
            return null;
          })
          .filter((name): name is string => name !== null && name !== "");
      };

      const companyDataList: Array<{
        company: { id: string; name: string; status?: string };
        salesperson: SalespersonInfo;
        optionNames: string[];
        forms: Awaited<ReturnType<typeof fetchCompanyFormsForEventAction>>;
      }> = [];
      const seenOptionKeys = new Set<string>();
      const formFetchPromises: Array<Promise<void>> = [];
      for (const company of companies) {
        const optionIds = getOptionIdsForEvent(company);
        const key = [...optionIds].sort().join(",");
        if (!seenOptionKeys.has(key)) {
          seenOptionKeys.add(key);
          formFetchPromises.push(
            fetchCompanyFormsForEventAction(selectedEventId, optionIds, true).then((forms) => {
              optionSetToForms.set(key, forms);
            })
          );
        }
      }
      await Promise.all(formFetchPromises);

      for (const company of companies) {
        const optionIds = getOptionIdsForEvent(company);
        const key = [...optionIds].sort().join(",");
        const forms = optionSetToForms.get(key) ?? [];
        if (forms.length === 0 && !matchingSoftware) continue;
        companyDataList.push({
          company: {
            id: company.id,
            name: company.name,
            status: (company as { status?: string }).status,
          },
          salesperson: getSalespersonInfo(company),
          optionNames: getOptionNamesForEvent(company),
          forms,
        });
      }

      // Collect all form IDs and company IDs for batch checks (any version = complete)
      const allFormIds = new Set<string>();
      const companyIds = companyDataList.map((d) => d.company.id);
      for (const { forms } of companyDataList) {
        forms.forEach((f) => allFormIds.add(f.id));
      }

      // Batch check: has company completed ANY version of each form?
      const [completedFormIdsMap, matchingSoftwareCompletedIds] = await Promise.all([
        checkCompanyFormCompletionByFormIdsBatchAction(companyIds, Array.from(allFormIds)),
        matchingSoftware
          ? getCompanyMatchingResponseCompletedIdsAction(matchingSoftware.id, companyIds)
          : Promise.resolve(new Set<string>()),
      ]);

      const statuses: CompanyFormStatus[] = companyDataList.map(({ company, salesperson, optionNames, forms }) => {
        const completedFormIds = completedFormIdsMap.get(company.id) ?? new Set<string>();
        const formStatuses: FormStatusItem[] = forms.map((form) => ({
          formId: form.id,
          formName: form.name,
          formSlug: form.slug,
          formVersionId: form.activeVersion.id,
          completed: completedFormIds.has(form.id), // Any version counts as complete
        }));
        if (matchingSoftware) {
          formStatuses.push({
            formId: `matching-software-${matchingSoftware.id}`,
            formName: "Matching Software",
            formSlug: "",
            formVersionId: "",
            completed: matchingSoftwareCompletedIds.has(company.id),
            isMatchingSoftware: true,
            matchingSoftwareLink: `/dashboard/matching-software/event/${encodeURIComponent(selectedEventId)}`,
          });
        }
        const incompleteCount = formStatuses.filter((f) => !f.completed).length;
        return { company, salesperson, optionNames, forms: formStatuses, incompleteCount };
      });

      statuses.sort((a, b) => {
        if (b.incompleteCount !== a.incompleteCount) return b.incompleteCount - a.incompleteCount;
        return a.company.name.localeCompare(b.company.name);
      });

      setCompanyStatuses(statuses);
    } catch (error) {
      console.error("Error loading company form status:", error);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      loadCompanyFormStatus();
      setSalespersonFilter("all");
    } else {
      setCompanyStatuses([]);
    }
  }, [selectedEventId]);

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  // Filter and sort for display
  const displayedStatuses = React.useMemo(() => {
    let result = [...companyStatuses];
    if (salespersonFilter !== "all") {
      result = result.filter((s) => s.salesperson?.id === salespersonFilter);
    }
    if (sortBy === "name-asc") {
      result = [...result].sort((a, b) => a.company.name.localeCompare(b.company.name));
    } else if (sortBy === "name-desc") {
      result = [...result].sort((a, b) => b.company.name.localeCompare(a.company.name));
    } else {
      result = [...result].sort((a, b) => {
        if (b.incompleteCount !== a.incompleteCount) return b.incompleteCount - a.incompleteCount;
        return a.company.name.localeCompare(b.company.name);
      });
    }
    return result;
  }, [companyStatuses, salespersonFilter, sortBy]);

  const uniqueSalespersons = React.useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of companyStatuses) {
      if (s.salesperson && !seen.has(s.salesperson.id)) {
        seen.set(s.salesperson.id, s.salesperson.name);
      }
    }
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [companyStatuses]);

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Company Form Completion</h1>
          <p className="text-muted-foreground mt-2">
            Overview of companies that haven&apos;t completed required forms and matching software for an event
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/forms">Back to Forms</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Event</CardTitle>
          <CardDescription>Choose an event to see company form completion status</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading events...</span>
            </div>
          ) : (
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select an event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name} - {event.date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {selectedEventId && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>
                {selectedEvent ? `${selectedEvent.name} - Form Completion Status` : "Loading..."}
              </CardTitle>
              <CardDescription>
                Filter and sort companies by name or salesperson
              </CardDescription>
            </div>
            {!loadingStatus && companyStatuses.length > 0 && (
              <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">
                {salespersonFilter === "all"
                  ? `${companyStatuses.length} companies`
                  : `${displayedStatuses.length} of ${companyStatuses.length} companies`}
              </span>
            )}
          </CardHeader>
          <CardContent>
            {!loadingStatus && companyStatuses.length > 0 && (
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Sort by:</span>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="incomplete">Incomplete count</SelectItem>
                      <SelectItem value="name-asc">Name (A–Z)</SelectItem>
                      <SelectItem value="name-desc">Name (Z–A)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Salesperson:</span>
                  <Select value={salespersonFilter} onValueChange={setSalespersonFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {uniqueSalespersons.map(([id, name]) => (
                        <SelectItem key={id} value={id}>
                          {name || id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            {loadingStatus ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading completion status...</p>
                </div>
              </div>
            ) : companyStatuses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {selectedEventId
                  ? "No companies found for this event or no company forms/matching software are configured."
                  : "Please select an event to view completion status."}
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Option</TableHead>
                      <TableHead>Salesperson</TableHead>
                      <TableHead>Forms</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedStatuses.map((status) => {
                      const isUnpublished = user?.admin && status.company.status !== "published";
                      return (
                      <TableRow
                        key={status.company.id}
                        className={isUnpublished ? "bg-red-50/80 dark:bg-red-950/20" : undefined}
                      >
                        <TableCell className="font-medium">
                          {status.company.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {status.optionNames.length > 0 ? status.optionNames.join(", ") : "–"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {status.salesperson?.name ?? "–"}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {status.forms.map((form) => (
                              <div key={form.formVersionId ? `${form.formId}-${form.formVersionId}` : form.formId} className="flex items-center gap-2">
                                {form.completed ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                )}
                                {form.isMatchingSoftware && form.matchingSoftwareLink ? (
                                  <Link
                                    href={form.matchingSoftwareLink}
                                    className="text-sm hover:underline"
                                    target="_blank"
                                  >
                                    {form.formName}
                                  </Link>
                                ) : (
                                  <Link
                                    href={`/forms/company/${selectedEventId}/${form.formSlug}`}
                                    className="text-sm hover:underline"
                                    target="_blank"
                                  >
                                    {form.formName}
                                  </Link>
                                )}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {status.incompleteCount === 0 ? (
                            <Badge variant="default" className="bg-green-600">
                              All Complete
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              {status.incompleteCount} Incomplete
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

