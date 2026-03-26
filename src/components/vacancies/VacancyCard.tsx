"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { getDirectusImageUrl } from "@/components/Images";
import { MapPin, Building2 } from "lucide-react";
import type { Vacancy, VacancyType, VacancySector, Master, Company } from "@/lib/schema";

interface VacancyCardProps {
  vacancy: Vacancy;
}

export function VacancyCard({ vacancy }: VacancyCardProps) {
  const company =
    typeof vacancy.company === "object"
      ? (vacancy.company as Company)
      : null;
  const typeName =
    typeof vacancy.type === "object"
      ? (vacancy.type as VacancyType).name
      : "";
  const sectorName =
    typeof vacancy.sector === "object"
      ? (vacancy.sector as VacancySector).name
      : "";
  const masterNames =
    vacancy.masters
      ?.map((m) =>
        typeof m.master_id === "object"
          ? (m.master_id as Master).short_name || (m.master_id as Master).name
          : ""
      )
      .filter(Boolean) ?? [];

  const logoUrl = company?.logo
    ? getDirectusImageUrl(company.logo, { width: 80, height: 80, quality: 80 })
    : undefined;

  return (
    <Link
      href={`/vacancies/${vacancy.id}`}
      className="block group border rounded-xl p-5 hover:shadow-md transition-shadow bg-white"
    >
      <div className="flex gap-4">
        {/* Company logo */}
        <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={company?.name ?? "Company"}
              width={56}
              height={56}
              className="object-contain"
            />
          ) : (
            <Building2 className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg group-hover:text-vtk-blue transition-colors truncate">
            {vacancy.title}
          </h3>
          {company && (
            <p className="text-sm text-muted-foreground">{company.name}</p>
          )}

          <div className="flex flex-wrap gap-2 mt-3">
            {typeName && (
              <Badge variant="secondary" className="bg-vtk-blue/10 text-vtk-blue">
                {typeName}
              </Badge>
            )}
            {sectorName && (
              <Badge variant="outline">{sectorName}</Badge>
            )}
            {vacancy.location && (
              <Badge variant="outline" className="gap-1">
                <MapPin className="h-3 w-3" />
                {vacancy.location}
              </Badge>
            )}
          </div>

          {masterNames.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {masterNames.map((name) => (
                <span
                  key={name}
                  className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Date */}
        <div className="hidden sm:block flex-shrink-0 text-xs text-muted-foreground">
          {new Date(vacancy.date_created).toLocaleDateString()}
        </div>
      </div>
    </Link>
  );
}
