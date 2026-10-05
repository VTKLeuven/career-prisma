import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { loadEventPage } from "@/lib/event-page-data"
import { loadPublicFloorplan } from "@/lib/floorplan-data"
import { getStudentFromCookies } from "@/lib/auth-student"
import { fetchMatchedCompanyIdsForEventAction } from "@/app/actions/matching-software"
import { slugifyEventName } from "@/lib/utils/slugify"
import { FloorplanView } from "./floorplan-view"
import { CompanyGuideView } from "./company-guide-view"
import { MatchingSoftwareView } from "./matching-software-view"

/**
 * /event/<name>/<subPage>: the floorplan, the company guide and the student
 * matching software. Rendered on the server with everything they show, so a
 * visitor gets the page in one response instead of an empty shell that then
 * fetches its data in a chain of round trips.
 *
 * The floorplan is gated to the dev environment by ./layout.tsx.
 */
const SUB_PAGE_TITLES: Record<string, string> = {
  floorplan: "Floorplan",
  "company-guide": "Company guide",
  "matching-software": "Matching software",
}

type Params = Promise<{ eventName: string; subPage: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { eventName, subPage } = await params
  const title = SUB_PAGE_TITLES[subPage]
  if (!title) return {}
  const page = await loadEventPage(eventName)
  return { title: page?.event?.name ? `${title} · ${page.event.name}` : title }
}

export default async function EventSubPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: Promise<{ redirectTo?: string | string[] }>
}) {
  const { eventName, subPage } = await params
  if (!SUB_PAGE_TITLES[subPage]) notFound()

  const page = await loadEventPage(eventName)
  if (!page?.event) notFound()

  const eventSlug = page.event.series_key || slugifyEventName(page.event.name)

  if (subPage === "floorplan") {
    const [floorplan, matching] = await Promise.all([
      loadPublicFloorplan(page, eventName),
      fetchMatchedCompanyIdsForEventAction(page.event.id),
    ])
    if (!floorplan) notFound()
    // The SVG markup stays on the server: the page loads the file by URL,
    // which the browser fetches in parallel and caches, instead of carrying
    // it twice (RSC payload and an encoded data URL) in every response.
    const { svg: _svg, ...floorplanForPage } = floorplan
    return (
      <FloorplanView
        eventName={page.event.name}
        eventSlug={eventSlug}
        floorplan={floorplanForPage}
        matching={matching}
      />
    )
  }

  if (subPage === "company-guide") {
    const guide = page.company_guide as string | { id?: string } | null | undefined
    const fileId = !guide ? null : typeof guide === "string" ? guide : guide.id ?? null
    return <CompanyGuideView eventName={page.event.name} fileId={fileId} />
  }

  // matching-software
  const [student, { redirectTo }] = await Promise.all([getStudentFromCookies(), searchParams])
  return (
    <MatchingSoftwareView
      eventId={page.event.id}
      eventName={page.event.name}
      eventSlug={eventSlug}
      studentId={student?.id ?? null}
      redirectTo={typeof redirectTo === "string" ? redirectTo : null}
    />
  )
}
