"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { getDirectusImageUrl } from "@/components/Images";
import { MapPin, Building2 } from "lucide-react";
import type { Vacancy, VacancyType, Master, Company } from "@/lib/schema";
import { getVacancySectorsResolved } from "@/lib/vacancy-sectors";

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
  const sectorEntries = getVacancySectorsResolved(vacancy);
  const masterNames =
    vacancy.masters
      ?.map((m) =>
        typeof m.master_id === "object"
          ? (m.master_id as Master).short_name || (m.master_id as Master).name
          : ""
      )
      .filter(Boolean) ?? [];

  const logoUrl = company?.logo
    ? getDirectusImageUrl(company.logo, {
        width: 112,
        height: 112,
        fit: "inside",
      })
    : undefined;

  return (
    <Link
      href={`/vacancies/${vacancy.id}`}
      className="block group rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-sm transition-all duration-200 hover:border-vtk-blue/30 hover:shadow-md"
    >
      <div className="flex gap-4">
        {/* No bg behind logo so PNG alpha shows the card (white); muted only for empty state */}
        <div
          className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden ${
            logoUrl ? "bg-transparent" : "bg-muted"
          }`}
        >
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={company?.name ?? "Company"}
              fill
              className="object-contain p-1.5"
              sizes="64px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg text-neutral-900 group-hover:text-vtk-blue transition-colors truncate">
            {vacancy.title}
          </h3>
          {company && (
            <p className="text-sm text-neutral-600">{company.name}</p>
          )}

          <div className="flex flex-wrap gap-2 mt-3">
            {typeName && (
              <Badge
                variant="secondary"
                className="border border-vtk-blue/15 bg-vtk-blue/10 font-medium text-vtk-blue-dark"
              >
                {typeName}
              </Badge>
            )}
            {sectorEntries.map((s) => (
              <Badge
                key={s.id}
                variant="outline"
                className="border-neutral-200 text-neutral-700"
              >
                {s.name}
              </Badge>
            ))}
            {vacancy.location && (
              <Badge variant="outline" className="gap-1 border-neutral-200 text-neutral-700">
                <MapPin className="h-3 w-3 text-vtk-blue/70" />
                {vacancy.location}
              </Badge>
            )}
          </div>

          {masterNames.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {masterNames.map((name) => (
                <span
                  key={name}
                  className="rounded-md bg-vtk-light/90 px-1.5 py-0.5 text-xs font-medium text-vtk-blue-dark"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Date */}
        <div className="hidden sm:block flex-shrink-0 text-xs font-medium text-vtk-blue/80">
          {new Date(vacancy.date_created).toLocaleDateString()}
        </div>
      </div>
    </Link>
  );
}
