'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { CareerEventPage, Speaker } from '@/lib/schema'
import { getDirectusImageUrl } from '@/components/Images'
import { slugifyCompanyName, slugifyEventName, getSpeakerSlug } from '@/lib/utils/slugify'
import { hasCompanyPageAccess } from '@/lib/utils/company-access'
import { usePageLayout } from '@/app/(public)/(site)/layout'

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
  const { setDarkHeaderFooter } = usePageLayout()
  const eventSlug = slugifyEventName(eventName)
  const allSpeakers = page.speakers ?? []
  const rep = speaker.representative

  useEffect(() => {
    setDarkHeaderFooter(true)
    return () => setDarkHeaderFooter(false)
  }, [setDarkHeaderFooter])
  const company = rep?.company
  const displayCompany = company ?? { name: "KU Leuven", logo: KU_LEUVEN_LOGO_ID }
  const companyLogoUrl = displayCompany.logo ? getDirectusImageUrl(displayCompany.logo) : undefined
  const avatarUrl = rep?.avatar ? getDirectusImageUrl(rep.avatar) : undefined
  const otherSpeakers = allSpeakers.filter((s) => s.id !== speaker.id)

  return (
    <main className="min-h-svh bg-black text-neutral-100">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left: avatar, name, company card */}
          <div className="lg:col-span-1 lg:order-1">
            <div className="sticky top-24 rounded-2xl border border-neutral-600/50 bg-neutral-800/60 p-6 shadow-xl shadow-black/20 backdrop-blur-sm transition-all hover:border-neutral-500/50">
              <div className="flex flex-col items-center text-center">
                <div className="relative aspect-square w-48 sm:w-56 overflow-hidden rounded-lg bg-neutral-700/50 ring-2 ring-neutral-600/50">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={rep ? `${rep.first_name ?? ""} ${rep.last_name ?? ""}`.trim() || "Speaker" : "Speaker"}
                      width={224}
                      height={224}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-5xl font-semibold text-neutral-500">
                      {(rep?.first_name?.[0] ?? rep?.last_name?.[0] ?? "?")}
                    </div>
                  )}
                  {/* Company overlay at bottom of photo */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent px-3 py-3 flex items-center justify-center gap-2">
                    {companyLogoUrl && (
                      <div className="h-8 w-8 shrink-0 overflow-hidden rounded bg-white/10">
                        <Image
                          src={companyLogoUrl}
                          alt={displayCompany.name}
                          width={32}
                          height={32}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    )}
                    <span className="font-medium text-white text-sm truncate">{displayCompany.name}</span>
                  </div>
                </div>
                <h1 className="mt-4 text-xl font-semibold text-white">
                  {rep?.first_name} {rep?.last_name}
                </h1>
                {company && hasCompanyPageAccess(company) && (
                  <Link
                    href={`/company/${slugifyCompanyName(company.name)}`}
                    className="mt-4 w-full rounded-lg bg-white/20 py-2 text-center text-sm font-medium text-white hover:bg-white/30 border border-white/40 transition-colors"
                  >
                    View company page
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Right: About, title+time, content (no section headings) */}
          <div className="lg:col-span-2 lg:order-2 space-y-8 text-white">
            {speaker.personal_information && (
              <section>
                <h2 className="text-sm font-medium uppercase tracking-wider text-white mb-2">About</h2>
                <div
                  className="prose prose-invert prose-neutral max-w-none prose-p:text-white prose-li:text-white prose-headings:text-white prose-strong:text-white [&_*]:text-white [&_a]:text-vtk-blue [&_a]:hover:text-vtk-blueDark"
                  dangerouslySetInnerHTML={{ __html: speaker.personal_information }}
                />
              </section>
            )}

            {(speaker.time?.title || speaker.time) && (
              <section>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  {speaker.time?.title && (
                    <p className="text-2xl font-semibold text-white">{speaker.time.title}</p>
                  )}
                  {speaker.time && (
                    <p className="text-lg text-white">
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
                  className="prose prose-invert prose-neutral max-w-none prose-p:text-white prose-li:text-white prose-headings:text-white prose-strong:text-white [&_*]:text-white [&_a]:text-vtk-blue [&_a]:hover:text-vtk-blueDark"
                  dangerouslySetInnerHTML={{ __html: speaker.content }}
                />
              </section>
            )}
          </div>
        </div>

        {/* Other speakers - horizontal scroll */}
        {otherSpeakers.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-semibold text-neutral-200 mb-4">Other speakers</h2>
            <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
              <div className="flex gap-4 min-w-max">
                {otherSpeakers.map((s) => (
                  <Link
                    key={s.id}
                    href={`/event/${eventSlug}/speakers/${getSpeakerSlug(s, allSpeakers)}`}
                    className="flex shrink-0 w-[140px] sm:w-[160px] flex-col overflow-hidden rounded-xl border border-neutral-600/50 bg-neutral-800/60 shadow-lg shadow-black/10 backdrop-blur-sm transition-all hover:border-neutral-500/50 hover:shadow-xl hover:shadow-black/20"
                  >
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
                        <div className="flex h-full w-full items-center justify-center bg-neutral-700/50 text-2xl font-semibold text-neutral-500">
                          {(s.representative?.first_name?.[0] ?? s.representative?.last_name?.[0] ?? "?")}
                        </div>
                      )}
                      {s.time?.start_time && (
                        <div className="absolute top-1.5 right-1.5 rounded bg-neutral-900/90 px-1.5 py-0.5 text-xs font-medium text-neutral-200 shadow-sm">
                          {s.time.end_time ? `${s.time.start_time} - ${s.time.end_time}` : s.time.start_time}
                        </div>
                      )}
                    </div>
                    <div className="p-2 text-center">
                      <div className="text-sm font-semibold text-neutral-100 truncate">
                        {s.representative?.first_name} {s.representative?.last_name}
                      </div>
                      <div className="text-xs text-neutral-400 truncate">
                        {s.representative?.company?.name ?? "KU Leuven"}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
