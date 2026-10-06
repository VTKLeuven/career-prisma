import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CompanyMatchingForm } from "@/components/CompanyMatchingForm";
import {
  getCompanyMatchingResponseForCompanyViewAction,
  getMatchingSoftwareForEventAction,
} from "@/app/actions/matching-software";
import { getStudentFormResponseDataForEventAction } from "@/app/actions/forms";
import { fetchCompanyByIdAction } from "@/app/actions/companies";
import { getUserFromCookies } from "@/lib/auth-server";
import { hasMatchingSoftwareSubOption } from "@/lib/utils/company-access";
import { normalizeStudents } from "@/lib/matching-students";

function BackToDashboard({ message }: { message: string }) {
  return (
    <div className="w-full gap-4 flex flex-col">
      <p className="text-muted-foreground">{message}</p>
      <Button asChild variant="outline" className="w-fit">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}

/**
 * A company's matching-software questions and matches for one event, loaded
 * here on the server. The page used to fetch the matching software and the
 * company, then the saved response, then the matched students' details --
 * server actions one after another -- behind a "Loading..." line.
 */
export default async function EventMatchingSoftwarePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  // The (protected) layout already turned away visitors who are not signed in.
  const user = await getUserFromCookies();
  const companyId = user?.company?.id;
  if (!companyId) return <BackToDashboard message="No company associated with your account." />;

  const [matchingSoftware, company] = await Promise.all([
    getMatchingSoftwareForEventAction(eventId).catch(() => null),
    fetchCompanyByIdAction(companyId, false, true).catch(() => null),
  ]);
  if (!matchingSoftware) return <BackToDashboard message="Matching software is not available for this event." />;

  const response = await getCompanyMatchingResponseForCompanyViewAction(companyId, matchingSoftware.id).catch(() => null);
  const students = normalizeStudents((response as { students?: unknown } | null)?.students);
  const studentFormData = students.length
    ? await getStudentFormResponseDataForEventAction(eventId, students.map((s) => s.id), {
        companyId,
        matchingSoftwareId: matchingSoftware.id,
      }).catch(() => new Map())
    : new Map();

  const event = matchingSoftware.event;
  const eventName = typeof event === "object" && event && "name" in event ? (event as { name: string }).name : undefined;

  return (
    <div className="w-full gap-4 flex flex-col">
      <Button asChild variant="outline" className="w-fit">
        <Link href="/dashboard">← Back to dashboard</Link>
      </Button>
      <CompanyMatchingForm
        companyId={companyId}
        matchingSoftwareId={matchingSoftware.id}
        eventId={eventId}
        eventName={eventName || undefined}
        companiesCanViewMatches={(matchingSoftware.companies_can_view_matches ?? false) && hasMatchingSoftwareSubOption(company)}
        initialData={{ response, studentFormData }}
      />
    </div>
  );
}
