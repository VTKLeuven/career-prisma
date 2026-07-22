"use client";

import Link from "next/link";
import { UserRoundCheck } from "lucide-react";
import { CompaniesSection } from "../companies-events/client";
import { Button } from "@/components/ui/button";
import { useUser } from "@/providers/UserProvider";

export default function AdminCompaniesPage() {
  const { user } = useUser();
  if (!user?.admin) return <p>NO ACCESS</p>;

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Companies</h1>
          <p className="text-muted-foreground">
            Manage company information, representatives and purchased event options.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/approvals">
            <UserRoundCheck className="mr-2 h-4 w-4" /> Pending approvals
          </Link>
        </Button>
      </div>
      <CompaniesSection />
    </div>
  );
}
