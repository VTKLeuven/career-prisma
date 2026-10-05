import "server-only";

import DOMPurify from "isomorphic-dompurify";
import { readFile } from "fs/promises";
import { listBooths } from "@/lib/repos/features";
import { getStoredFile } from "@/lib/file-storage";
import type { CareerEventPage, Booth, Master } from "@/lib/schema";

/**
 * The floorplan of an event page: its sanitised SVG, the booths drawn on it and
 * the optional background image.
 *
 * Deliberately not a server action. It reads whatever file
 * `page.floorplan.svg_file` names, so the `page` must come from the database --
 * never from a client, which could otherwise name any upload (a CV, say) and
 * read it back.
 */
export async function loadFloorplanData(page: CareerEventPage) {
  if (!page.floorplan?.svg_file || page.floorplan.svg_file.length === 0) return null;

  const svgFileId = page.floorplan.svg_file;
  const stored = await getStoredFile(svgFileId);
  if (!stored) throw new Error("Floorplan SVG not found");
  const svgText = await readFile(stored.filePath, "utf8");

  // Fetch booths data
  const data = await listBooths(page.floorplan, { limit: -1 });

  // Sanitize SVG
  const sanitizedSvg = DOMPurify.sanitize(svgText, {
    ADD_ATTR: ['target', 'rel', 'allow', 'allowfullscreen', 'frameborder'],
  });

  if (!data) return { svg: sanitizedSvg, booths: [] as Booth[], backgroundImage: page.floorplan.background_image || null };

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
