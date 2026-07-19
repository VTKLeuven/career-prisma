"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getFileUrl } from "@/components/Images";
import Image from "next/image";
import { ReactNode } from "react";
import { useState, useEffect, useCallback } from "react";
import { fetchCompanyByIdAction } from "@/app/actions/companies";
import { useUser } from "@/providers/UserProvider";
import type { Company } from "@/lib/schema";
import { SectionLayout } from "@/components/dashboard/SectionLayout";
import { validateExistingPageImage } from "@/lib/utils/image-validation";
import { IconAlertTriangle } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function isFileLike(value: unknown): value is File {
  return typeof value === "object" && value !== null && "name" in value;
}

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [company, setCompany] = useState<Company | null>(null);
  const [pageImageValid, setPageImageValid] = useState<boolean | null>(null);

  // Function to check page image validity
  const checkPageImage = useCallback(async () => {
    if (!user?.company) {
      setPageImageValid(null);
      return;
    }

    try {
      const fetched = await fetchCompanyByIdAction(user.company.id);
      const companyData = fetched as Company ?? null;
      setCompany(companyData);
      
      // Validate existing page image
      if (companyData?.page_image) {
        const pageImageUrl = getFileUrl(companyData.page_image);
        if (pageImageUrl) {
          const validation = await validateExistingPageImage(pageImageUrl);
          setPageImageValid(validation.valid);
        } else {
          setPageImageValid(null);
        }
      } else {
        setPageImageValid(null);
      }
    } catch (error) {
      console.error("Error checking page image validity:", error);
      setPageImageValid(false);
    }
  }, [user?.company?.id]);

  useEffect(() => {
    checkPageImage();
  }, [checkPageImage]);

  // Listen for company update events
  useEffect(() => {
    const handleCompanyUpdate = (event: CustomEvent) => {
      // Re-check page image validity when company is updated
      if (event.detail?.companyId === user?.company?.id) {
        checkPageImage();
      }
    };

    window.addEventListener('company-updated', handleCompanyUpdate as EventListener);
    
    return () => {
      window.removeEventListener('company-updated', handleCompanyUpdate as EventListener);
    };
  }, [checkPageImage, user?.company?.id]);

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