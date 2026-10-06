"use client";

import { useEffect, useState } from "react";
import type { Company, Master, CareerEvent, Speaker } from "@/lib/schema";
import { getFileUrl } from "@/components/Images";
import Image from "next/image";
import Link from "next/link";
import { validateExistingPageImage } from "@/lib/utils/image-validation";
import { Calendar } from "lucide-react";
import { slugifyEventName } from "@/lib/utils/slugify";
import { SiteHeader } from "@/components/site/SiteHeader";
import { usePageLayout } from '../../site-shell';
import { CompanyLikeButton } from "@/components/CompanyLikeButton";
import { groupSpeakersByTimeSlot } from "@/lib/utils/speakers";
import { getSpeakerSlug } from "@/lib/utils/slugify";

/**
 * A public company page. Everything it shows is loaded by ./page.tsx; only the
 * page image is checked here, because the check loads the image.
 */
export function CompanyPageClient({
  company,
  speakers,
  events,
}: {
  company: Company;
  speakers: Array<Speaker & { eventName: string }>;
  events: CareerEvent[];
}) {
  const { setHideLayoutHeader } = usePageLayout()
  const [pageImageValid, setPageImageValid] = useState<boolean | null>(null);

  // This page renders its own header.
  useEffect(() => {
    setHideLayoutHeader(true)
    return () => setHideLayoutHeader(false)
  }, [setHideLayoutHeader])

  // Validate the page image before showing it as the background.
  const bgUrl = getFileUrl(company.page_image) ?? null;
  useEffect(() => {
    if (!bgUrl) return;
    let cancelled = false;
    validateExistingPageImage(bgUrl)
      .then((result) => {
        if (!cancelled) setPageImageValid(result.valid);
      })
      .catch(() => {
        if (!cancelled) setPageImageValid(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bgUrl]);

  const logoUrl = getFileUrl(company.logo);
  const categories = (company.category as Master[] | undefined) ?? [];

  // Only use bgUrl if it's valid
  const validBgUrl = pageImageValid === true ? bgUrl : null;

  return (
    <main className="relative min-h-svh bg-vtk-bg text-neutral-900">
      <SiteHeader
        extraNavItems={
          speakers.length > 0
            ? [{
                key: "discovery-stage",
                label: "Discovery Stage",
                onSelect: () =>
                  document.getElementById("discovery-stage")?.scrollIntoView({ behavior: "smooth" }),
              }]
            : []
        }
      />
      <div className="pt-24 md:pt-28">
        {validBgUrl && (
          <div className="absolute inset-0 z-0">
            <Image src={validBgUrl} alt={company.name} fill className="object-cover" />
          </div>
        )}
        <div className="relative z-10">
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="relative rounded-2xl border bg-white/85 backdrop-blur-sm p-6 shadow-sm">
            <CompanyLikeButton companyId={company.id} />
            <div className="flex items-center gap-3 sm:gap-5 flex-col sm:flex-row">
              <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-xl border bg-neutral-50 flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  <Image src={logoUrl} alt={company.name} width={80} height={80} className="object-contain" />
                ) : (
                  <span className="text-sm text-neutral-500">No logo</span>
                )}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900">{company.name}</h1>
                {categories.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-3 justify-center sm:justify-start">
                    {categories.map((cat) => {
                      const catLogo = getFileUrl(cat.logo);
                      if (!catLogo) return null;
                      return (
                        <span
                          key={cat.id}
                          className="relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-transparent"
                        >
                          <Image src={catLogo} alt="" width={32} height={32} className="object-contain transform scale-110" />
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="lg:col-span-2 flex flex-col gap-4 sm:gap-6">
              {company.short_description && (
                <div className="rounded-2xl border bg-white/85 backdrop-blur-sm p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-neutral-900">About</h2>
                  <div className="prose max-w-none mt-3" dangerouslySetInnerHTML={{ __html: company.short_description || "" }} />
                </div>
              )}

              {company.long_description && (
                <div className="rounded-2xl border bg-white/85 backdrop-blur-sm p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-neutral-900">More details</h2>
                  <div className="prose max-w-none mt-3" dangerouslySetInnerHTML={{ __html: company.long_description || "" }} />
                </div>
              )}

              {speakers.length > 0 && (
                <div id="discovery-stage" className="rounded-2xl border bg-white/85 backdrop-blur-sm p-4 sm:p-6 shadow-sm scroll-mt-28">
                  <h2 className="text-lg sm:text-xl font-semibold text-neutral-900 mb-4 sm:mb-6">Discovery Stage</h2>
                  <CompanySpeakersSection speakers={speakers} />
                </div>
              )}

              {events.length > 0 && (
                <div className="rounded-2xl border bg-white/85 backdrop-blur-sm p-4 sm:p-6 shadow-sm">
                  <h2 className="text-lg sm:text-xl font-semibold text-neutral-900 mb-4 sm:mb-6">Attending at</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {events.slice(0, 3).map((event) => {
                      const href = `/event/${slugifyEventName(event.name || "")}`;
                      return (
                        <Link
                          key={event.id}
                          href={href}
                          className="group relative block h-full"
                        >
                          <div className="h-full flex flex-col rounded-[28px] bg-white/90 p-3 shadow-[0_10px_40px_rgba(11,77,140,0.08)] ring-1 ring-black/5 backdrop-blur-md transition-transform duration-300 hover:-translate-y-2 hover:rotate-1">
                            <div className="relative overflow-hidden rounded-[20px] flex-shrink-0">
                              <div className="aspect-[4/3]">
                                {event.image && (
                                  <Image
                                    src={getFileUrl(event.image)!}
                                    alt={event.name}
                                    fill
                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                  />
                                )}
                              </div>
                              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                              {event.shout ? (
                                <span className="absolute left-3 top-3 rounded-full bg-vtk-yellow px-2 py-0.5 text-xs font-bold text-black shadow-sm">
                                  {event.shout}
                                </span>
                              ) : null}
                            </div>
                            <div className="px-2 pb-2 pt-3 flex-1 flex flex-col">
                              <div className="text-base font-semibold tracking-tight text-neutral-900 line-clamp-2">{event.name}</div>
                              <div className="mt-1 flex items-center gap-2 text-sm text-neutral-700">
                                <Calendar className="h-4 w-4 text-vtk-blue flex-shrink-0" />
                                <span className="line-clamp-1">{event.date} · {event.location}</span>
                              </div>
                            </div>
                          </div>
                          <div aria-hidden className="absolute inset-x-6 -bottom-3 h-6 rounded-full bg-black/10 blur-md opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <aside className="flex flex-col gap-4 sm:gap-6">
              {company.location && (
                <div className="rounded-2xl border bg-white/85 backdrop-blur-sm p-4 sm:p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-neutral-900">Located at</h3>
                  <div className="mt-2 text-sm text-neutral-700">{company.location}</div>
                </div>
              )}

              {company.website && (
                <div className="rounded-2xl border bg-white/85 backdrop-blur-sm p-4 sm:p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-neutral-900">Website</h3>
                  <div className="mt-2">
                    <Link href={company.website} target="_blank" className="text-vtk-blue underline break-all">{company.website}</Link>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>
        </div>
      </div>
    </main>
  );
}

// ---------------- CompanySpeakersSection ----------------
const KU_LEUVEN_LOGO_ID = "d93c21e6-1145-4d4e-96d2-7e8daa640b9f";

function CompanySpeakersSection({ speakers }: { speakers: Array<Speaker & { eventName: string }> }) {
  const byEvent = new Map<string, Speaker[]>();
  for (const s of speakers) {
    const eventName = s.eventName ?? "Event";
    const list = byEvent.get(eventName) ?? [];
    list.push(s);
    byEvent.set(eventName, list);
  }

  return (
    <div className="space-y-8">
      {Array.from(byEvent.entries()).map(([eventName, eventSpeakers]) => {
        const eventSlug = slugifyEventName(eventName);
        const grouped = groupSpeakersByTimeSlot(eventSpeakers);
        return (
          <div key={eventName}>
            <h3 className="text-base font-semibold text-neutral-700 mb-3">{eventName}</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {grouped.map((group) =>
                group.length === 1 ? (
                  <CompanySpeakerCard key={group[0].id} speaker={group[0]} eventSlug={eventSlug} allSpeakers={eventSpeakers} />
                ) : (
                  <CompanySpeakerCardMulti key={group[0].id} speakers={group} eventSlug={eventSlug} allSpeakers={eventSpeakers} />
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CompanySpeakerCard({ speaker, eventSlug, allSpeakers }: { speaker: Speaker; eventSlug: string; allSpeakers: Speaker[] }) {
  const rep = speaker.representative;
  const avatarUrl = rep?.avatar ? getFileUrl(rep.avatar) : undefined;
  const company = rep?.company;
  const displayCompany = company ?? { name: "KU Leuven", logo: KU_LEUVEN_LOGO_ID };
  const companyLogoUrl = displayCompany.logo ? getFileUrl(displayCompany.logo) : undefined;
  const startHour = speaker.time?.start_time;
  const endHour = speaker.time?.end_time;
  const timeLabel = startHour && endHour ? `${startHour} - ${endHour}` : startHour ?? endHour ?? null;

  return (
    <Link
      href={`/event/${eventSlug}/speakers/${getSpeakerSlug(speaker, allSpeakers)}`}
      className="flex w-full flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-square w-full">
        {avatarUrl ? (
          <Image src={avatarUrl} alt="" fill className="object-cover" sizes="160px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-2xl font-semibold text-neutral-400">
            {(rep?.first_name?.[0] ?? rep?.last_name?.[0] ?? "?")}
          </div>
        )}
        {timeLabel && (
          <div className="absolute top-1.5 right-1.5 rounded bg-white/90 px-1.5 py-0.5 text-xs font-medium text-vtk-blue shadow-sm">
            {timeLabel}
          </div>
        )}
      </div>
      <div className="p-2 text-center">
        <div className="text-sm font-semibold text-neutral-900">{(rep?.first_name ?? "")} {rep?.last_name}</div>
        <div className="mt-1 flex items-center justify-center gap-1.5">
          {companyLogoUrl && (
            <div className="h-4 w-4 shrink-0 overflow-hidden rounded">
              <Image src={companyLogoUrl} alt={displayCompany.name} width={16} height={16} className="h-full w-full object-contain" />
            </div>
          )}
          <span className="text-xs text-neutral-600 truncate">{displayCompany.name}</span>
        </div>
      </div>
    </Link>
  );
}

function CompanySpeakerCardMulti({ speakers, eventSlug, allSpeakers }: { speakers: Speaker[]; eventSlug: string; allSpeakers: Speaker[] }) {
  const t = speakers[0]?.time;
  const timeLabel = t ? (t.start_time && t.end_time ? `${t.start_time} - ${t.end_time}` : t.start_time ?? t.end_time ?? null) : null;

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="relative aspect-square w-full flex">
        {speakers.map((speaker) => {
          const rep = speaker.representative;
          const avatarUrl = rep?.avatar ? getFileUrl(rep.avatar) : undefined;
          return (
            <Link
              key={speaker.id}
              href={`/event/${eventSlug}/speakers/${getSpeakerSlug(speaker, allSpeakers)}`}
              className="relative flex-1 min-w-0"
            >
              {avatarUrl ? (
                <Image src={avatarUrl} alt="" fill className="object-cover" sizes="160px" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 text-2xl font-semibold text-neutral-400">
                  {(rep?.first_name?.[0] ?? rep?.last_name?.[0] ?? "?")}
                </div>
              )}
            </Link>
          );
        })}
        {timeLabel && (
          <div className="absolute top-1.5 right-1.5 rounded bg-white/90 px-1.5 py-0.5 text-xs font-medium text-vtk-blue shadow-sm">
            {timeLabel}
          </div>
        )}
      </div>
      <div className="p-2 space-y-2">
        {speakers.map((speaker) => {
          const rep = speaker.representative;
          const company = rep?.company;
          const displayCompany = company ?? { name: "KU Leuven", logo: KU_LEUVEN_LOGO_ID };
          const companyLogoUrl = displayCompany.logo ? getFileUrl(displayCompany.logo) : undefined;
          return (
            <Link
              key={speaker.id}
              href={`/event/${eventSlug}/speakers/${getSpeakerSlug(speaker, allSpeakers)}`}
              className="block text-center hover:bg-neutral-50 -mx-1 px-1 py-0.5 rounded transition-colors"
            >
              <div className="text-sm font-semibold text-neutral-900">{(rep?.first_name ?? "")} {rep?.last_name}</div>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                {companyLogoUrl && (
                  <div className="h-4 w-4 shrink-0 overflow-hidden rounded">
                    <Image src={companyLogoUrl} alt={displayCompany.name} width={16} height={16} className="h-full w-full object-contain" />
                  </div>
                )}
                <span className="text-xs text-neutral-600 truncate">{displayCompany.name}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
