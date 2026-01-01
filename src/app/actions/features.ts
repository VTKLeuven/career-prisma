// app/actions/floorplan.ts
"use server";
import { listBooths, listMasters } from "@/lib/repos/features";
import { CareerEventPage, Booth, Master } from "@/lib/schema";
import DOMPurify from "isomorphic-dompurify"

export async function fetchFloorplanAction(page: CareerEventPage) {
  if (!page.floorplan?.svg_file || page.floorplan.svg_file.length === 0) return null;

  // Fetch SVG file
  const svgFileId = page.floorplan.svg_file;
  const svgFileRes = await fetch(`${process.env.NEXT_PUBLIC_DIRECTUS_URL}assets/${svgFileId}`);
  const svgText = await svgFileRes.text();

  // Fetch booths data
  const data = await listBooths(page.floorplan);
  if (!data) return { svg: svgText, booths: [] };

  // Sanitize SVG
  const sanitizedSvg = DOMPurify.sanitize(svgText, {
    ADD_ATTR: ['target', 'rel', 'allow', 'allowfullscreen', 'frameborder'],
  });

  // Parse booths
  const booths: Booth[] = (data as Booth[])
    .map((booth) => {
      if (!booth) return null;

      // Parse coords if stored as JSON string
      let coords;
      try {
        coords = typeof booth.coords === "string" ? JSON.parse(booth.coords) : booth.coords;
      } catch {
        return null;
      }

      // Unwrap company.category -> Master[]
      if (booth.company?.category) {
        booth.company.category = (booth.company.category as unknown as Array<{ master_id: Master }>)
          .map((item) => item.master_id) // unwrap master_id
          .filter((m: Master | null): m is Master => !!m); // ensure non-null
      }

      return { ...booth, coords };
    })
    .filter((b): b is Booth => !!b); // remove nulls

  return {
    svg: sanitizedSvg,
    booths,
    backgroundImage: page.floorplan.background_image || null,
  };
}

export async function fetchMastersAction() {
    const masters = await listMasters({ limit: 50, sort: "name" }) ?? [];
    return masters
}