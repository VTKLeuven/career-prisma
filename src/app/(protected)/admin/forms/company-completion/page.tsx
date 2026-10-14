"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { fetchEventsAction } from "@/app/actions/events";
import { fetchCompanyFormsForEventAction, checkCompanyFormCompletionBatchWithCompulsoryAction } from "@/app/actions/forms";
import { fetchCompaniesForEventAction } from "@/app/actions/companies";
import { getMatchingSoftwareForEventAction, getCompanyMatchingResponseCompletedIdsAction, fetchMatchedCompaniesAction } from "@/app/actions/matching-software";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { CareerEvent } from "@/lib/schema";
import Link from "next/link";
import { useUser } from "@/providers/UserProvider";
import { PageHeader } from "@/components/admin/PageHeader";

type FormStatusItem = {
  formId: string;
  formName: string;
  formSlug: string;
  formVersionId: string;
  completed: boolean;
  isCompulsory?: boolean;
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

export default function CompanyFormCompletionPage() {
  const { user } = useUser();
  const [events, setEvents] = useState<CareerEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [companyStatuses, setCompanyStatuses] = useState<CompanyFormStatus[]>([]);

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
      const [registeredCompanies, matchingSoftware] = await Promise.all([
        fetchCompaniesForEventAction(selectedEventId, false),
        getMatchingSoftwareForEventAction(selectedEventId),
      ]);

      const matchingSoftwareCompletedIds = matchingSoftware
        ? await getCompanyMatchingResponseCompletedIdsAction(matchingSoftware.id, [])
        : new Set<string>();

      const registeredIds = new Set(registeredCompanies.map((c) => String(c.id)));
      const extraIdsFromMatching = matchingSoftware
        ? Array.from(matchingSoftwareCompletedIds).filter((id) => !registeredIds.has(String(id)))
        : [];
      const extraCompanies =
        extraIdsFromMatching.length > 0 ? await fetchMatchedCompaniesAction(extraIdsFromMatching) : [];
      const companies = [...registeredCompanies, ...extraCompanies];

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
        optionKey: string;
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
            name: company.name ?? "",
            status: (company as { status?: string }).status,
          },
          salesperson: getSalespersonInfo(company as { salesperson?: unknown }),
          optionNames: getOptionNamesForEvent(company as { options?: unknown[] }),
          optionKey: key,
          forms,
        });
      }

      const companyIds = companyDataList.map((d) => d.company.id);

      // Group companies by option set (same options = same forms), then batch check per group
      const optionKeyToCompanies = new Map<string, typeof companyDataList>();
      for (const d of companyDataList) {
        const list = optionKeyToCompanies.get(d.optionKey) ?? [];
        list.push(d);
        optionKeyToCompanies.set(d.optionKey, list);
      }

      const completedFormIdsMap = new Map<string, Set<string>>();
      companyIds.forEach((id) => completedFormIdsMap.set(id, new Set()));

      const batchPromises = Array.from(optionKeyToCompanies.entries()).map(async ([, list]) => {
        const first = list[0];
        if (!first || first.forms.length === 0) return;
        const formsForCheck = first.forms.map((f) => ({
          formId: f.id,
          formVersionId: f.activeVersion.id,
          versionNumber: f.activeVersion.version_number,
          isCompulsory: (f.metadata as { is_compulsory?: boolean })?.is_compulsory === true,
        }));
        const companyIdsInGroup = list.map((d) => d.company.id);
        const batch = await checkCompanyFormCompletionBatchWithCompulsoryAction(companyIdsInGroup, formsForCheck);
        for (const [cid, formIds] of batch) {
          completedFormIdsMap.set(cid, formIds);
        }
      });

      await Promise.all(batchPromises);

      const statuses: CompanyFormStatus[] = companyDataList.map(({ company, salesperson, optionNames, forms }) => {
        const completedFormIds = completedFormIdsMap.get(company.id) ?? new Set<string>();
        const formStatuses: FormStatusItem[] = forms.map((form) => ({
          formId: form.id,
          formName: form.name,
          formSlug: form.slug,
          formVersionId: form.activeVersion.id,
          completed: completedFormIds.has(form.id),
          isCompulsory: (form.metadata as { is_compulsory?: boolean })?.is_compulsory === true,
        }));
        if (matchingSoftware) {
          const companyIdNorm = String(company.id ?? "").trim();
          formStatuses.push({
            formId: `matching-software-${matchingSoftware.id}`,
            formName: "Matching Software",
            formSlug: "",
            formVersionId: "",
            completed: companyIdNorm ? matchingSoftwareCompletedIds.has(companyIdNorm) : false,
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
    } else {
      setCompanyStatuses([]);
    }
  }, [selectedEventId]);

  const selectedEvent = events.find((e) => e.id === selectedEventId);


  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        title="Company Form Completion"
        description="Overview of companies that haven't completed required forms and matching software for an event"
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/forms">Back to Forms</Link>
          </Button>
        }
      />

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
          <CardHeader>
            <CardTitle>
              {selectedEvent ? `${selectedEvent.name} - Form Completion Status` : "Loading..."}
            </CardTitle>
            <CardDescription>
              Most incomplete first. Sort by any column; filter by salesperson, option or status.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
              <DataTable
                rows={companyStatuses}
                columns={[
                  { key: "company", label: "Company", value: (status) => status.company.name },
                  {
                    key: "options",
                    label: "Option",
                    className: "text-muted-foreground text-sm",
                    value: (status) => status.optionNames,
                    filter: true,
                  },
                  {
                    key: "salesperson",
                    label: "Salesperson",
                    className: "text-muted-foreground text-sm",
                    value: (status) => status.salesperson?.name ?? null,
                    filter: true,
                  },
                  {
                    key: "forms",
                    label: "Forms",
                    wrap: true,
                    sortable: false,
                    searchable: false,
                    render: (status) => (
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
                                {form.isCompulsory && !form.completed && (
                                  <span className="ml-1 text-xs font-medium text-amber-600">(Mandatory)</span>
                                )}
                              </Link>
                            )}
                          </div>
                        ))}
                      </div>
                    ),
                  },
                  {
                    key: "incompleteCount",
                    label: "Status",
                    searchable: false,
                    filter: { label: "Incomplete forms", options: [{ value: "0", label: "All complete" }] },
                    render: (status) =>
                      status.incompleteCount === 0 ? (
                        <Badge variant="success">All complete</Badge>
                      ) : (
                        <Badge variant="destructive">{status.incompleteCount} incomplete</Badge>
                      ),
                  },
                ]}
                getRowId={(status) => status.company.id}
                noun="company"
                nounPlural="companies"
                containerClassName=""
                rowClassName={(status) =>
                  user?.admin && status.company.status !== "published" ? "bg-red-50/80 dark:bg-red-950/20" : undefined
                }
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

