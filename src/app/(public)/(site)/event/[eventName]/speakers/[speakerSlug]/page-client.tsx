'use client'

import { useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { CareerEventPage, Speaker } from '@/lib/schema'
import { getDirectusImageUrl } from '@/components/Images'
import { slugifyCompanyName, slugifyEventName, getSpeakerSlug } from '@/lib/utils/slugify'
import { hasCompanyPageAccess } from '@/lib/utils/company-access'
const KU_LEUVEN_LOGO_ID = "d93c21e6-1145-4d4e-96d2-7e8daa640b9f"

export default function SpeakerPageClient({
  page,
  speaker,
  eventName,
}: {
  page: CareerEventPage
  speaker: Speaker
  eventName: string
}) {
  const avatarRef = useRef<HTMLDivElement>(null)
  const eventSlug = slugifyEventName(eventName)
  const allSpeakers = page.speakers ?? []
  const rep = speaker.representative
  const company = rep?.company
  const displayCompany = company ?? { name: "KU Leuven", logo: KU_LEUVEN_LOGO_ID }
  const companyLogoUrl = displayCompany.logo ? getDirectusImageUrl(displayCompany.logo) : undefined
  const avatarUrl = rep?.avatar ? getDirectusImageUrl(rep.avatar) : undefined
  const otherSpeakers = allSpeakers.filter((s) => s.id !== speaker.id)

  return (
    <main className="min-h-svh text-neutral-900">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left: avatar, company name, speaker name card */}
          <div className="lg:col-span-1 lg:order-1">
            {company ? (
              <Link
                href={`/company/${slugifyCompanyName(company.name)}`}
                onClick={(e) => {
                  if (avatarRef.current?.contains(e.target as Node)) {
                    e.preventDefault()
                  }
                }}
                className="block sticky top-24 cursor-pointer rounded-2xl border bg-white p-6 shadow-soft transition-all hover:border-vtk-blue/30"
              >
                <div className="flex flex-col items-center text-center">
                  <div
                    ref={avatarRef}
                    className="relative aspect-square w-48 sm:w-56 overflow-hidden rounded-lg bg-neutral-100 ring-2 ring-neutral-200 cursor-default"
                  >
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={rep ? `${rep.first_name ?? ""} ${rep.last_name ?? ""}`.trim() || "Speaker" : "Speaker"}
                      width={224}
                      height={224}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-5xl font-semibold text-neutral-400">
                      {(rep?.first_name?.[0] ?? rep?.last_name?.[0] ?? "?")}
                    </div>
                  )}
                  {/* Speaker name overlay at bottom of photo */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent px-3 py-3 flex items-center justify-center">
                    <span className="font-medium text-white text-sm truncate">
                      {rep?.first_name} {rep?.last_name}
                    </span>
                  </div>
                </div>
                <h1 className="mt-4 text-xl font-semibold text-neutral-900">
                  {displayCompany.name}
                </h1>
                {companyLogoUrl && (
                  <div className="mt-2 h-10 w-10 shrink-0 overflow-hidden rounded">
                    <Image
                      src={companyLogoUrl}
                      alt={displayCompany.name}
                      width={40}
                      height={40}
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}
                  {hasCompanyPageAccess(company) && (
                    <span className="mt-4 inline-block w-full rounded-lg bg-vtk-blue py-2 text-center text-sm font-medium text-white">
                      View company page
                    </span>
                  )}
                </div>
              </Link>
            ) : (
              <div className="sticky top-24 rounded-2xl border bg-white p-6 shadow-soft transition-all">
                <div className="flex flex-col items-center text-center">
                  <div className="relative aspect-square w-48 sm:w-56 overflow-hidden rounded-lg bg-neutral-100 ring-2 ring-neutral-200">
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt={rep ? `${rep.first_name ?? ""} ${rep.last_name ?? ""}`.trim() || "Speaker" : "Speaker"}
                        width={224}
                        height={224}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-5xl font-semibold text-neutral-400">
                        {(rep?.first_name?.[0] ?? rep?.last_name?.[0] ?? "?")}
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent px-3 py-3 flex items-center justify-center">
                      <span className="font-medium text-white text-sm truncate">
                        {rep?.first_name} {rep?.last_name}
                      </span>
                    </div>
                  </div>
                  <h1 className="mt-4 text-xl font-semibold text-neutral-900">
                    {displayCompany.name}
                  </h1>
                  {companyLogoUrl && (
                    <div className="mt-2 h-10 w-10 shrink-0 overflow-hidden rounded">
                      <Image
                        src={companyLogoUrl}
                        alt={displayCompany.name}
                        width={40}
                        height={40}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: About, title+time, content (no section headings) */}
          <div className="lg:col-span-2 lg:order-2 space-y-8 text-neutral-900">
            {speaker.personal_information && (
              <section>
                <h2 className="text-sm font-medium uppercase tracking-wider text-neutral-600 mb-2">About</h2>
                <div
                  className="prose prose-neutral max-w-none prose-p:text-neutral-800 prose-li:text-neutral-800 prose-headings:text-neutral-900 prose-strong:text-neutral-900 [&_a]:text-vtk-blue [&_a]:hover:text-vtk-blue-dark"
                  dangerouslySetInnerHTML={{ __html: speaker.personal_information }}
                />
              </section>
            )}

            {(speaker.time?.title || speaker.time) && (
              <section>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  {speaker.time?.title && (
                    <p className="text-2xl font-semibold text-neutral-900">{speaker.time.title}</p>
                  )}
                  {speaker.time && (
                    <p className="text-lg text-neutral-700">
                      {speaker.time.start_time}
                      {speaker.time.end_time ? ` – ${speaker.time.end_time}` : ''}
                    </p>
                  )}
                </div>
              </section>
            )}

            {speaker.content && (
              <section>
                <div
                  className="prose prose-neutral max-w-none prose-p:text-neutral-800 prose-li:text-neutral-800 prose-headings:text-neutral-900 prose-strong:text-neutral-900 [&_a]:text-vtk-blue [&_a]:hover:text-vtk-blue-dark"
                  dangerouslySetInnerHTML={{ __html: speaker.content }}
                />
              </section>
            )}
          </div>
        </div>

        {/* Other speakers - horizontal scroll */}
        {otherSpeakers.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-semibold text-neutral-900 mb-4">Other speakers</h2>
            <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
              <div className="flex gap-4 min-w-max">
                {otherSpeakers.map((s) => {
                  const sCompany = s.representative?.company
                  const companyHref = sCompany ? `/company/${slugifyCompanyName(sCompany.name)}` : null
                  return (
                    <div
                      key={s.id}
                      className="flex shrink-0 w-[140px] sm:w-[160px] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-soft transition-all hover:border-neutral-300 hover:shadow-md"
                    >
                      <Link href={`/event/${eventSlug}/speakers/${getSpeakerSlug(s, allSpeakers)}`} className="block">
                        <div className="relative aspect-square w-full">
                          {s.representative?.avatar ? (
                            <Image
                              src={getDirectusImageUrl(s.representative.avatar)!}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="160px"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-2xl font-semibold text-neutral-400">
                              {(s.representative?.first_name?.[0] ?? s.representative?.last_name?.[0] ?? "?")}
                            </div>
                          )}
                          {s.time?.start_time && (
                            <div className="absolute top-1.5 right-1.5 rounded bg-white/95 px-1.5 py-0.5 text-xs font-medium text-neutral-700 shadow-sm border border-neutral-200">
                              {s.time.end_time ? `${s.time.start_time} - ${s.time.end_time}` : s.time.start_time}
                            </div>
                          )}
                        </div>
                      </Link>
                      {companyHref ? (
                        <Link href={companyHref} className="block p-2 text-center hover:bg-neutral-50 transition-colors">
                          <div className="text-sm font-semibold text-neutral-900 truncate">
                            {s.representative?.first_name} {s.representative?.last_name}
                          </div>
                          <div className="text-xs text-neutral-600 truncate">
                            {s.representative?.company?.name ?? "KU Leuven"}
                          </div>
                        </Link>
                      ) : (
                        <div className="p-2 text-center">
                          <div className="text-sm font-semibold text-neutral-900 truncate">
                            {s.representative?.first_name} {s.representative?.last_name}
                          </div>
                          <div className="text-xs text-neutral-600 truncate">
                            {s.representative?.company?.name ?? "KU Leuven"}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
