"use client";

import { useEffect, useState } from "react";
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
import { getDirectusImageUrl } from "@/components/Images";
import type {
  Vacancy,
  VacancyType,
  VacancySector,
  VacancySectionConfig,
  Master,
  Company,
} from "@/lib/schema";
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
      <div className="min-h-screen bg-gradient-to-br from-vtk-blue/5 via-white to-vtk-yellow/5">
        <div className="container mx-auto px-4 py-12 max-w-4xl space-y-6">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          <div className="h-64 bg-muted animate-pulse rounded-xl" />
          <div className="h-96 bg-muted animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  if (!vacancy) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-vtk-blue/5 via-white to-vtk-yellow/5">
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold mb-4">Vacancy not found</h1>
          <Button asChild variant="outline">
            <Link href="/vacancies">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to vacancies
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const company =
    typeof vacancy.company === "object" ? (vacancy.company as Company) : null;
  const typeName =
    typeof vacancy.type === "object" ? (vacancy.type as VacancyType).name : "";
  const sectorName =
    typeof vacancy.sector === "object"
      ? (vacancy.sector as VacancySector).name
      : "";
  const masterNames =
    vacancy.masters
      ?.map((m) =>
        typeof m.master_id === "object" ? (m.master_id as Master).name : ""
      )
      .filter(Boolean) ?? [];

  const logoUrl = company?.logo
    ? getDirectusImageUrl(company.logo, {
        width: 120,
        height: 120,
        quality: 80,
      })
    : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-vtk-blue/5 via-white to-vtk-yellow/5">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Back link */}
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/vacancies">
            <ArrowLeft className="mr-2 h-4 w-4" />
            All vacancies
          </Link>
        </Button>

        {/* Header card */}
        <div className="bg-white rounded-xl border shadow-sm p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Logo */}
            <div className="flex-shrink-0 w-20 h-20 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={company?.name ?? ""}
                  width={80}
                  height={80}
                  className="object-contain"
                />
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">
                {vacancy.title}
              </h1>
              {company && (
                <p className="text-lg text-muted-foreground mb-4">
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
                  <Badge className="bg-vtk-blue/10 text-vtk-blue border-vtk-blue/20">
                    {typeName}
                  </Badge>
                )}
                {sectorName && <Badge variant="outline">{sectorName}</Badge>}
                {vacancy.location && (
                  <Badge variant="outline" className="gap-1">
                    <MapPin className="h-3 w-3" />
                    {vacancy.location}
                  </Badge>
                )}
              </div>
              {masterNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {masterNames.map((name) => (
                    <span
                      key={name}
                      className="text-xs bg-muted rounded-full px-2.5 py-1 text-muted-foreground"
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
              const html = vacancy.sections?.[cfg.key];
              if (!html || html === "<p></p>") return null;
              return (
                <div
                  key={cfg.key}
                  className="bg-white rounded-xl border p-6 sm:p-8"
                >
                  <h2 className="text-xl font-semibold mb-4">{cfg.label}</h2>
                  <div
                    className="prose prose-sm max-w-none prose-headings:text-neutral-900 prose-p:text-neutral-700"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                </div>
              );
            })}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact info */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold mb-4">Contact Information</h3>
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
                className="w-full mt-4 gap-2"
                onClick={() => setShowContactForm(!showContactForm)}
              >
                <MessageSquare className="h-4 w-4" />
                {showContactForm ? "Hide form" : "Send a message"}
              </Button>
            </div>

            {/* Posted date */}
            <div className="bg-white rounded-xl border p-6">
              <p className="text-sm text-muted-foreground">
                Posted on{" "}
                <span className="font-medium text-neutral-900">
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
          <div className="mt-6 bg-white rounded-xl border p-6 sm:p-8">
            <h2 className="text-xl font-semibold mb-2">
              Send a message to {company?.name ?? "this company"}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
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
  );
}
