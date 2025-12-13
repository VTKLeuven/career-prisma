"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { fetchEventsAction } from "@/app/actions/events";
import { fetchCompanyFormsForEventAction, checkCompanyFormCompletionAction } from "@/app/actions/forms";
import { fetchCompaniesForEventAction } from "@/app/actions/companies";
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
import type { CareerEvent, Company } from "@/lib/schema";
import Link from "next/link";

type CompanyFormStatus = {
  company: { id: string; name: string };
  forms: Array<{
    formId: string;
    formName: string;
    formSlug: string;
    formVersionId: string;
    completed: boolean;
  }>;
  incompleteCount: number;
};

export default function CompanyFormCompletionPage() {
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
      // Get all companies registered for this event
      const companies = await fetchCompaniesForEventAction(selectedEventId, false);
      
      if (companies.length === 0) {
        setCompanyStatuses([]);
        setLoadingStatus(false);
        return;
      }

      // Get all company forms for this event
      // We need to check forms for each company based on their options
      const statuses: CompanyFormStatus[] = [];

      for (const company of companies) {
        // Get company with full details to access options
        const { fetchCompanyByIdAction } = await import("@/app/actions/companies");
        const fullCompany = await fetchCompanyByIdAction(company.id);
        
        if (!fullCompany) continue;

        // Get company option IDs (handle junction table format)
        const companyOptionIds = fullCompany.options
          ?.map((opt) => {
            if (typeof opt === 'string') return opt;
            if (opt && typeof opt === 'object') {
              // Check for junction table format: { career_event_option_id: { id: "..." } }
              if ('career_event_option_id' in opt) {
                const optionRef = (opt as any).career_event_option_id;
                if (typeof optionRef === 'string') return optionRef;
                if (optionRef && typeof optionRef === 'object' && 'id' in optionRef) {
                  return optionRef.id;
                }
              }
              // Check for direct id
              if ('id' in opt) return opt.id;
            }
            return null;
          })
          .filter((id): id is string => id !== null) || [];

        // Get forms for this company
        const forms = await fetchCompanyFormsForEventAction(selectedEventId, companyOptionIds);
        
        if (forms.length === 0) continue;

        // Check completion status
        const formVersionIds = forms.map((f) => f.activeVersion.id);
        const completedVersionIds = await checkCompanyFormCompletionAction(company.id, formVersionIds);

        const formStatuses = forms.map((form) => ({
          formId: form.id,
          formName: form.name,
          formSlug: form.slug,
          formVersionId: form.activeVersion.id,
          completed: completedVersionIds.has(form.activeVersion.id),
        }));

        const incompleteCount = formStatuses.filter((f) => !f.completed).length;

        statuses.push({
          company: { id: company.id, name: company.name },
          forms: formStatuses,
          incompleteCount,
        });
      }

      // Sort by incomplete count (descending) then by company name
      statuses.sort((a, b) => {
        if (b.incompleteCount !== a.incompleteCount) {
          return b.incompleteCount - a.incompleteCount;
        }
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
    <div className="container mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Company Form Completion</h1>
          <p className="text-muted-foreground mt-2">
            Overview of companies that haven&apos;t completed required forms for an event
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
          <CardHeader>
            <CardTitle>
              {selectedEvent ? `${selectedEvent.name} - Form Completion Status` : "Loading..."}
            </CardTitle>
            <CardDescription>
              Companies are sorted by number of incomplete forms
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
                  ? "No companies found for this event or no company forms are configured."
                  : "Please select an event to view completion status."}
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Forms</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Incomplete</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyStatuses.map((status) => (
                      <TableRow key={status.company.id}>
                        <TableCell className="font-medium">
                          {status.company.name}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {status.forms.map((form) => (
                              <div key={form.formId} className="flex items-center gap-2">
                                {form.completed ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                )}
                                <Link
                                  href={`/forms/company/${selectedEventId}/${form.formSlug}`}
                                  className="text-sm hover:underline"
                                  target="_blank"
                                >
                                  {form.formName}
                                </Link>
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
                        <TableCell>
                          {status.incompleteCount > 0 && (
                            <div className="space-y-1">
                              {status.forms
                                .filter((f) => !f.completed)
                                .map((form) => (
                                  <div key={form.formId} className="text-sm text-muted-foreground">
                                    • {form.formName}
                                  </div>
                                ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
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

