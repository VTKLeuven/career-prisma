// app/actions/floorplan.ts
"use server";
import { listBooths } from "@/lib/repos/features";
import { CareerEventPage, Booth } from "@/lib/schema";
import DOMPurify from "isomorphic-dompurify"

export async function fetchFloorplanAction(page: CareerEventPage) {
  if (!page.floorplan?.svg_file || page.floorplan.svg_file.length === 0) return null
  const svgFileId = page.floorplan.svg_file
  const svgFileRes = await fetch(`${process.env.NEXT_PUBLIC_DIRECTUS_URL}assets/${svgFileId}`)
  const svgText = await svgFileRes.text()

  const data = await listBooths(page.floorplan)
  if (!data) return { svg: svgText, booths: [] }

  const sanitizedSvg = DOMPurify.sanitize(svgText, {
    ADD_ATTR: ['target', 'rel', 'allow', 'allowfullscreen', 'frameborder']
  })

  const booths = (data as Booth[]).map((booth) => {
    if (!booth.coords) return null
    let coords
    try {
      coords = typeof booth.coords === "string" ? JSON.parse(booth.coords) : booth.coords
    } catch {
      return null
    }
    return { ...booth, coords }
  }).filter(Boolean)

  return {
    svg: sanitizedSvg,
    booths
  }
}
