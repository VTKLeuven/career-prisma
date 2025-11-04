"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getDirectusImageUrl } from "@/components/Images";
import Image from "next/image";
import { ReactNode } from "react";
import { useState, useEffect } from "react";
import { fetchCompanyByIdAction } from "@/app/actions/companies";
import { useUser } from "@/providers/UserProvider";
import type { Company } from "@/lib/schema";

function isFileLike(value: unknown): value is File {
  return typeof value === "object" && value !== null && "name" in value;
}

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    if (!user?.company) return;
    fetchCompanyByIdAction(user.company.id)
      .then((fetched) => setCompany(fetched as Company ?? null))
      .catch(console.error);
  }, [user?.company]);

  return (
    <div className="w-full flex flex-col gap-4">
      <CompanyHeaderCard company={company} />
      <div>{children}</div>
    </div>
  );
}

function CompanyHeaderCard({ company }: { company: Company | null }) {
  if (!company) {
    return (
      <Card className="rounded-2xl shadow-md bg-slate-700 text-white">
        <CardHeader>
          <CardTitle>Company Profile</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const logoSrc = isFileLike(company.logo)
    ? URL.createObjectURL(company.logo)
    : getDirectusImageUrl(company.logo);

  return (
    <Card className="rounded-2xl shadow-md bg-slate-700 text-white">
      <CardHeader className="flex items-center gap-4">
        {logoSrc && (
          <Image
            src={logoSrc}
            alt={company.name || "logo"}
            width={48}
            height={48}
            className="h-12 w-12 object-contain rounded-lg"
          />
        )}
        <div>
          <CardTitle>{company.name || "Company Profile"}</CardTitle>
          {company.address_city && <CardDescription>{company.address_city}</CardDescription>}
        </div>
      </CardHeader>
    </Card>
  );
}