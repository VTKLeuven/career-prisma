"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VacancyContactForm } from "@/components/vacancies/VacancyContactForm";
import {
  fetchPublicVacancyByIdAction,
  fetchVacancySectionConfigsAction,
} from "@/app/actions/vacancies";
import { getFileUrl } from "@/components/Images";
import type {
  Vacancy,
  VacancyType,
  VacancySectionConfig,
  Master,
  Company,
} from "@/lib/schema";
import {
  getVacancySectorsResolved,
  vacancySectorDisplayName,
} from "@/lib/vacancy-sectors";
import {
  ArrowLeft,
  MapPin,
  Mail,
  Phone,
  User,
  Building2,
  Globe,
  MessageSquare,
} from "lucide-react";

export default function VacancyDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [sectionConfigs, setSectionConfigs] = useState<VacancySectionConfig[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [showContactForm, setShowContactForm] = useState(false);
  const contactFormSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showContactForm) return;
    contactFormSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [showContactForm]);

  useEffect(() => {
    Promise.all([
      fetchPublicVacancyByIdAction(id),
      fetchVacancySectionConfigsAction(),
    ]).then(([v, sc]) => {
      setVacancy(v);
      setSectionConfigs(sc ?? []);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-vtk-blue/5">
        <div className="px-2 sm:px-0">
          <div className="mx-auto w-full max-w-7xl space-y-6 px-2 py-16 sm:px-4 sm:py-24">
          <div className="h-8 w-32 animate-pulse rounded-md bg-vtk-light/60" />
          <div className="h-64 animate-pulse rounded-2xl bg-vtk-light/50" />
          <div className="h-96 animate-pulse rounded-2xl bg-vtk-light/50" />
          </div>
        </div>
      </div>
    );
  }

  if (!vacancy) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-vtk-blue/5">
        <div className="px-2 sm:px-0">
          <div className="mx-auto w-full max-w-7xl px-2 py-24 text-center sm:px-4">
          <div className="mx-auto max-w-md rounded-2xl border border-neutral-200/80 bg-white p-10 shadow-sm">
            <h1 className="mb-2 text-2xl font-bold text-neutral-900">
              Vacancy not found
            </h1>
            <p className="mb-6 text-neutral-600">
              This listing may have been removed or is no longer published.
            </p>
            <Button
              asChild
              variant="outline"
              className="border-vtk-blue/30 text-vtk-blue hover:bg-vtk-blue/5"
            >
              <Link href="/vacancies">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to vacancies
              </Link>
            </Button>
          </div>
          </div>
        </div>
      </div>
    );
  }

  const company =
    typeof vacancy.company === "object" ? (vacancy.company as Company) : null;
  const typeName =
    typeof vacancy.type === "object" ? (vacancy.type as VacancyType).name : "";
  const sectorEntries = getVacancySectorsResolved(vacancy);
  const masterNames =
    vacancy.masters
      ?.map((m) =>
        typeof m.master_id === "object" ? (m.master_id as Master).name : ""
      )
      .filter(Boolean) ?? [];

  const logoUrl = company?.logo
    ? getFileUrl(company.logo, {
        width: 160,
        height: 160,
        fit: "inside",
      })
    : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-vtk-blue/5">
      <div className="px-2 sm:px-0">
        <div className="mx-auto w-full max-w-7xl px-2 py-16 sm:px-4 sm:py-24">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="mb-8 -ml-2 text-vtk-blue hover:bg-vtk-blue/5 hover:text-vtk-blue-dark"
        >
          <Link href="/vacancies">
            <ArrowLeft className="mr-2 h-4 w-4" />
            All vacancies
          </Link>
        </Button>

        <div className="mb-6 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm ring-1 ring-vtk-blue/[0.04] sm:p-8">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Transparent PNGs: no fill behind image (card is white); muted only without logo */}
            <div
              className={`relative flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden ${
                logoUrl ? "bg-transparent" : "bg-muted"
              }`}
            >
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={company?.name ?? ""}
                  fill
                  className="object-contain p-2"
                  sizes="(max-width: 640px) 96px, 112px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Building2 className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <h1 className="mb-1 text-2xl font-bold text-neutral-900 sm:text-3xl">
                {vacancy.title}
              </h1>
              {company && (
                <p className="mb-4 text-lg text-neutral-600">
                  {company.name}
                  {(company as any).website && (
                    <a
                      href={(company as any).website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center ml-2 text-vtk-blue hover:underline text-sm"
                    >
                      <Globe className="h-3 w-3 mr-1" />
                      Website
                    </a>
                  )}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {typeName && (
                  <Badge className="border border-vtk-blue/20 bg-vtk-blue/10 font-medium text-vtk-blue-dark">
                    {typeName}
                  </Badge>
                )}
                {sectorEntries.map((s) => (
                  <Badge
                    key={s.id}
                    variant="outline"
                    className="border-neutral-200 text-neutral-700"
                  >
                    {vacancySectorDisplayName(s)}
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
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {masterNames.map((name) => (
                    <span
                      key={name}
                      className="rounded-full bg-vtk-light/90 px-2.5 py-1 text-xs font-medium text-vtk-blue-dark"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dynamic sections */}
            {sectionConfigs.map((cfg) => {
              const html =
                vacancy.sections?.[cfg.id] ??
                (cfg.key ? vacancy.sections?.[cfg.key] : undefined);
              if (!html || html === "<p></p>") return null;
              return (
                <div
                  key={cfg.id}
                  className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm sm:p-8"
                >
                  <h2 className="mb-4 border-b border-vtk-blue/10 pb-3 text-xl font-semibold text-neutral-900">
                    {cfg.label}
                  </h2>
                  <div
                    className="prose prose-sm max-w-none prose-headings:text-neutral-900 prose-p:text-neutral-700 prose-a:text-vtk-blue prose-strong:text-neutral-900 prose-li:marker:text-vtk-blue/60"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                </div>
              );
            })}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact info */}
            <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-neutral-900">
                <span className="h-1 w-6 rounded-full bg-vtk-yellow" aria-hidden />
                Contact information
              </h3>
              <div className="space-y-3 text-sm">
                {vacancy.contact_name && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>{vacancy.contact_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <a
                    href={`mailto:${vacancy.contact_email}`}
                    className="text-vtk-blue hover:underline break-all"
                  >
                    {vacancy.contact_email}
                  </a>
                </div>
                {vacancy.contact_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <a
                      href={`tel:${vacancy.contact_phone}`}
                      className="text-vtk-blue hover:underline"
                    >
                      {vacancy.contact_phone}
                    </a>
                  </div>
                )}
              </div>

              <Button
                className="mt-4 w-full gap-2 bg-vtk-blue text-white shadow-sm hover:bg-vtk-blue-dark"
                onClick={() => setShowContactForm(!showContactForm)}
              >
                <MessageSquare className="h-4 w-4" />
                {showContactForm ? "Hide form" : "Send a message"}
              </Button>
            </div>

            {/* Posted date */}
            <div className="rounded-2xl border border-neutral-200/80 bg-vtk-bg/80 p-6 shadow-sm">
              <p className="text-sm text-neutral-600">
                Posted on{" "}
                <span className="font-semibold text-vtk-blue-dark">
                  {new Date(vacancy.date_created).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Contact form (full width below) */}
        {showContactForm && (
          <div
            ref={contactFormSectionRef}
            className="mt-8 scroll-mt-28 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm ring-1 ring-vtk-blue/[0.06] sm:p-8 md:scroll-mt-32"
          >
            <h2 className="mb-2 text-xl font-semibold text-neutral-900">
              Send a message to {company?.name ?? "this company"}
            </h2>
            <p className="mb-6 text-sm text-neutral-600">
              Your message will be sent directly to the company. You can attach
              your CV or other documents.
            </p>
            <VacancyContactForm
              vacancyId={vacancy.id}
              companyName={company?.name ?? "the company"}
            />
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
