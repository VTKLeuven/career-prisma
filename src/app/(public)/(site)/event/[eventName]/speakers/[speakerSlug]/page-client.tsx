'use client'

import { useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { CareerEventPage, Speaker } from '@/lib/schema'
import { getDirectusImageUrl } from '@/components/Images'
import { slugifyCompanyName, slugifyEventName, getSpeakerSlug } from '@/lib/utils/slugify'
import { hasCompanyPageAccess } from '@/lib/utils/company-access'
import { groupSpeakersByTimeSlot } from '@/lib/utils/speakers'

const KU_LEUVEN_LOGO_ID = "d93c21e6-1145-4d4e-96d2-7e8daa640b9f"

export default function SpeakerPageClient({
  page,
  speakers,
  eventName,
}: {
  page: CareerEventPage
  speakers: Speaker[]
  eventName: string
}) {
  const eventSlug = slugifyEventName(eventName)
  const allSpeakers = page.speakers ?? []
  const primarySpeaker = speakers[0]
  const otherSpeakers = allSpeakers.filter((s) => !speakers.some((sp) => sp.id === s.id))
  const otherSpeakersGrouped = groupSpeakersByTimeSlot(otherSpeakers)
  const sharedTime = primarySpeaker?.time
  const sharedContent = primarySpeaker?.content

  return (
    <main className="min-h-svh text-neutral-900">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left: avatar, company name, speaker name card(s) */}
          <div className="lg:col-span-1 lg:order-1 space-y-6">
            {speakers.map((speaker) => (
              <SpeakerSidebarCard key={speaker.id} speaker={speaker} sticky={speakers.length === 1} />
            ))}
          </div>

          {/* Right: About sections, shared title+time, shared content */}
          <div className="lg:col-span-2 lg:order-2 space-y-8 text-neutral-900">
            {speakers.map((speaker) =>
              speaker.personal_information ? (
                <section key={speaker.id}>
                  <h2 className="text-sm font-medium uppercase tracking-wider text-neutral-600 mb-2">
                    {speakers.length > 1
                      ? `About ${speaker.representative?.first_name ?? ''} ${speaker.representative?.last_name ?? ''}`.trim()
                      : 'About'}
                  </h2>
                  <div
                    className="prose prose-neutral max-w-none prose-p:text-neutral-800 prose-li:text-neutral-800 prose-headings:text-neutral-900 prose-strong:text-neutral-900 [&_a]:text-vtk-blue [&_a]:hover:text-vtk-blue-dark"
                    dangerouslySetInnerHTML={{ __html: speaker.personal_information }}
                  />
                </section>
              ) : null
            )}

            {(sharedTime?.title || sharedTime) && (
              <section>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  {sharedTime.title && (
                    <p className="text-2xl font-semibold text-neutral-900">{sharedTime.title}</p>
                  )}
                  {sharedTime && (
                    <p className="text-lg text-neutral-700">
                      {sharedTime.start_time}
                      {sharedTime.end_time ? ` – ${sharedTime.end_time}` : ''}
                    </p>
                  )}
                </div>
              </section>
            )}

            {sharedContent && (
              <section>
                <div
                  className="prose prose-neutral max-w-none prose-p:text-neutral-800 prose-li:text-neutral-800 prose-headings:text-neutral-900 prose-strong:text-neutral-900 [&_a]:text-vtk-blue [&_a]:hover:text-vtk-blue-dark"
                  dangerouslySetInnerHTML={{ __html: sharedContent }}
                />
              </section>
            )}
          </div>
        </div>

        {/* Other speakers - horizontal scroll, chronologically, same time = same card */}
        {otherSpeakersGrouped.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-semibold text-neutral-900 mb-4">Other speakers</h2>
            <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
              <div className="flex gap-4 min-w-max">
                {otherSpeakersGrouped.map((group) =>
                  group.length === 1 ? (
                    <OtherSpeakerCard key={group[0].id} speaker={group[0]} eventSlug={eventSlug} allSpeakers={allSpeakers} />
                  ) : (
                    <OtherSpeakerCardMulti key={group[0].id} speakers={group} eventSlug={eventSlug} allSpeakers={allSpeakers} />
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

function SpeakerSidebarCard({ speaker, sticky = true }: { speaker: Speaker; sticky?: boolean }) {
  const avatarRef = useRef<HTMLDivElement>(null)
  const rep = speaker.representative
  const company = rep?.company
  const displayCompany = company ?? { name: "KU Leuven", logo: KU_LEUVEN_LOGO_ID }
  const companyLogoUrl = displayCompany.logo ? getDirectusImageUrl(displayCompany.logo) : undefined
  const avatarUrl = rep?.avatar ? getDirectusImageUrl(rep.avatar) : undefined

  const cardContent = (
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
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent px-3 py-3 flex items-center justify-center">
          <span className="font-medium text-white text-sm truncate">
            {rep?.first_name} {rep?.last_name}
          </span>
        </div>
      </div>
      <h1 className="mt-4 text-xl font-semibold text-neutral-900">{displayCompany.name}</h1>
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
      {company && hasCompanyPageAccess(company) && (
        <span className="mt-4 inline-block w-full rounded-lg bg-vtk-blue py-2 text-center text-sm font-medium text-white">
          View company page
        </span>
      )}
    </div>
  )

  const stickyClass = sticky ? 'sticky top-24' : ''
  if (company) {
    return (
      <Link
        href={`/company/${slugifyCompanyName(company.name)}`}
        onClick={(e) => {
          if (avatarRef.current?.contains(e.target as Node)) {
            e.preventDefault()
          }
        }}
        className={`block ${stickyClass} cursor-pointer rounded-2xl border bg-white p-6 shadow-soft transition-all hover:border-vtk-blue/30`}
      >
        {cardContent}
      </Link>
    )
  }

  return (
    <div className={`${stickyClass} rounded-2xl border bg-white p-6 shadow-soft transition-all`}>
      {cardContent}
    </div>
  )
}

function OtherSpeakerCard({ speaker: s, eventSlug, allSpeakers }: { speaker: Speaker; eventSlug: string; allSpeakers: Speaker[] }) {
  const sCompany = s.representative?.company
  const companyHref = sCompany ? `/company/${slugifyCompanyName(sCompany.name)}` : null
  return (
    <div className="flex shrink-0 w-[140px] sm:w-[160px] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-soft transition-all hover:border-neutral-300 hover:shadow-md">
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
        <Link href={companyHref} className="flex flex-col items-center justify-center p-2 text-center hover:bg-neutral-50 transition-colors">
          <div className="text-sm font-semibold text-neutral-900 truncate w-full">
            {s.representative?.first_name} {s.representative?.last_name}
          </div>
          <div className="text-xs text-neutral-600 truncate w-full">
            {s.representative?.company?.name ?? "KU Leuven"}
          </div>
        </Link>
      ) : (
        <div className="flex flex-col items-center justify-center p-2 text-center">
          <div className="text-sm font-semibold text-neutral-900 truncate w-full">
            {s.representative?.first_name} {s.representative?.last_name}
          </div>
          <div className="text-xs text-neutral-600 truncate w-full">
            {s.representative?.company?.name ?? "KU Leuven"}
          </div>
        </div>
      )}
    </div>
  )
}

function OtherSpeakerCardMulti({ speakers, eventSlug, allSpeakers }: { speakers: Speaker[]; eventSlug: string; allSpeakers: Speaker[] }) {
  const t = speakers[0]?.time
  const timeLabel = t ? (t.start_time && t.end_time ? `${t.start_time} - ${t.end_time}` : t.start_time ?? t.end_time ?? null) : null
  return (
    <div className="flex shrink-0 w-[140px] sm:w-[160px] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-soft transition-all hover:border-neutral-300 hover:shadow-md">
      <div className="relative aspect-square w-full flex">
        {speakers.map((speaker) => {
          const rep = speaker.representative
          const avatarUrl = rep?.avatar ? getDirectusImageUrl(rep.avatar) : undefined
          return (
            <Link
              key={speaker.id}
              href={`/event/${eventSlug}/speakers/${getSpeakerSlug(speaker, allSpeakers)}`}
              className="relative flex-1 min-w-0"
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={rep ? `${rep.first_name ?? ""} ${rep.last_name ?? ""}`.trim() || "Speaker" : "Speaker"}
                  fill
                  className="object-cover"
                  sizes="160px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 text-2xl font-semibold text-neutral-400">
                  {(rep?.first_name?.[0] ?? rep?.last_name?.[0] ?? "?")}
                </div>
              )}
            </Link>
          )
        })}
        {timeLabel && (
          <div className="absolute top-1.5 right-1.5 rounded bg-white/95 px-1.5 py-0.5 text-xs font-medium text-neutral-700 shadow-sm border border-neutral-200">
            {timeLabel}
          </div>
        )}
      </div>
      <div className="flex flex-col items-center justify-center p-2 space-y-2">
        {speakers.map((speaker) => {
          const rep = speaker.representative
          return (
            <Link
              key={speaker.id}
              href={`/event/${eventSlug}/speakers/${getSpeakerSlug(speaker, allSpeakers)}`}
              className="flex flex-col items-center justify-center text-center hover:bg-neutral-50 -mx-1 px-1 py-0.5 rounded transition-colors"
            >
              <div className="text-sm font-semibold text-neutral-900 truncate w-full">
                {rep?.first_name} {rep?.last_name}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
