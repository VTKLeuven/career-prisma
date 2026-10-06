import Link from "next/link";
import { UserRoundCheck } from "lucide-react";
import { CompaniesSection } from "./companies-section";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/PageHeader";
import { getUserFromCookies } from "@/lib/auth-server";
import { fetchCompaniesWithSubOptionsAction } from "@/app/actions/companies";
import { fetchSalespersonsAction } from "@/app/actions/salespeople";
import { listRoles } from "@/lib/repos/users";
import { loadPublicMasters } from "@/lib/masters-data";

/**
 * The companies and the salespeople (for the assignee pickers) are loaded
 * here, in parallel. The client page used to fetch them with two server
 * actions after hydrating, which Next runs one after the other.
 */
export default async function AdminCompaniesPage() {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;

  const [companies, salespersons, roles, masters] = await Promise.all([
    fetchCompaniesWithSubOptionsAction(),
    fetchSalespersonsAction().catch(() => []),
    listRoles(),
    loadPublicMasters(),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        title="Companies"
        description="Manage company information, representatives and purchased event options."
        actions={
          <Button variant="outline" asChild>
            <Link href="/admin/approvals">
              <UserRoundCheck className="h-4 w-4" /> Pending approvals
            </Link>
          </Button>
        }
      />
      <CompaniesSection
        initialData={companies}
        salespersons={salespersons ?? []}
        roleOptions={roles.map((r) => ({ value: r.id, label: r.name }))}
        masters={masters}
      />
    </div>
  );
}
