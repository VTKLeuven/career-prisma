"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getFileUrl } from "@/components/Images";
import Image from "next/image";
import { ReactNode } from "react";
import { useState, useEffect } from "react";
import type { Company } from "@/lib/schema";
import { useSettingsCompany } from "./settings-company";
import { SectionLayout } from "@/components/dashboard/SectionLayout";
import { validateExistingPageImage } from "@/lib/utils/image-validation";
import { IconAlertTriangle } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function isFileLike(value: unknown): value is File {
  return typeof value === "object" && value !== null && "name" in value;
}

/** The settings header, tabs and page-image warning around each settings tab. */
export function SettingsShell({ children }: { children: ReactNode }) {
  const { company } = useSettingsCompany();
  const pageImage = typeof company?.page_image === "string" ? company.page_image : null;
  // Checked in the browser (it loads the image); again whenever a save changes it.
  const [pageImageCheck, setPageImageCheck] = useState<{ image: string; valid: boolean } | null>(null);
  const pageImageValid = pageImage && pageImageCheck?.image === pageImage ? pageImageCheck.valid : null;

  useEffect(() => {
    const url = pageImage ? getFileUrl(pageImage) : null;
    if (!pageImage || !url) return;
    let alive = true;
    validateExistingPageImage(url)
      .then((result) => alive && setPageImageCheck({ image: pageImage, valid: result.valid }))
      .catch(() => alive && setPageImageCheck({ image: pageImage, valid: false }));
    return () => {
      alive = false;
    };
  }, [pageImage]);

  const pathname = usePathname();
  const isInfoActive = pathname === "/dashboard/settings/information" || pathname?.startsWith("/dashboard/settings/information/");

  return (
    <div className="w-full flex flex-col gap-4">
      <CompanyHeaderCard company={company} />
      <SectionLayout
        title="Settings"
        description="Manage your company information, users, and billing"
        items={[
          <Link
            key="/dashboard/settings/information"
            href="/dashboard/settings/information"
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              isInfoActive
                ? "border-vtk-blue text-vtk-blue"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
            }`}
          >
            Company Information
            {pageImageValid === false && (
              <IconAlertTriangle className="h-5 w-5 text-red-600" title="Page background image has invalid dimensions" />
            )}
          </Link>,
          { title: "Users", url: "/dashboard/settings/users" },
          { title: "Billing", url: "/dashboard/settings/billing" },
        ]}
      >
        {children}
      </SectionLayout>
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
    : getFileUrl(company.logo);

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