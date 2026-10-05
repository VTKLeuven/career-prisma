"use client";

import Link from "next/link";
import { UserRoundCheck } from "lucide-react";
import { CompaniesSection } from "./companies-section";
import { Button } from "@/components/ui/button";
import { useUser } from "@/providers/UserProvider";
import { PageHeader } from "@/components/admin/PageHeader";

export default function AdminCompaniesPage() {
  const { user } = useUser();
  if (!user?.admin) return <p>NO ACCESS</p>;

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
      <CompaniesSection />
    </div>
  );
}
