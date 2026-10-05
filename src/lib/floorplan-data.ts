import "server-only";

import DOMPurify from "isomorphic-dompurify";
import { readFile } from "fs/promises";
import { listBooths, listMasters } from "@/lib/repos/features";
import {
  getCompanyFloorplanCategoryValues,
  getCompanyFormFieldValuesFromForm,
  getCompanyMasterDegreesFromFormBatch,
  getFloorplanCategoryOptions,
  type FloorplanCategoryOptionGroup,
} from "@/lib/repos/forms";
import { getCachedFloorplan, setCachedFloorplan } from "@/lib/floorplan-cache";
import { getStoredFile } from "@/lib/file-storage";
import { toPublicCompany } from "@/lib/repos/_shape";
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

      // Public floorplan: the booth's company without staff or sales history.
      return { ...booth, company: toPublicCompany(booth.company), coords } as Booth;
    })
    .filter((b): b is Booth => !!b); // remove nulls

  return {
    svg: sanitizedSvg,
    booths,
    backgroundImage: page.floorplan.background_image || null,
  };
}

type FormFieldRef = { formId: string; formVersionId: string; fieldName: string };

/**
 * Everything the public floorplan page renders, assembled on the server in
 * one go. The page used to fetch this piece by piece from the browser -- the
 * event JSON, then the floorplan, then up to five server actions, which Next
 * runs one at a time -- and asked the server again on every category click.
 */
export type PublicFloorplan = {
  /** The sanitised SVG markup, for the floorplan app's JSON endpoint. */
  svg: string;
  /** The SVG's file id: the web page loads it by URL so the browser can cache it. */
  svgFileId: string;
  /** The SVG's own viewBox, so the client does not have to parse the SVG. */
  viewBox: string;
  backgroundImage: string | null;
  booths: Booth[];
  /** True when the floorplan filters on a form's master-degrees field. */
  useFormCategories: boolean;
  /** Form-based filter options (when useFormCategories). */
  formCategoryGroups: FloorplanCategoryOptionGroup[];
  /** Company-master filter options (when not useFormCategories). */
  categories: Master[];
  /** companyId -> canonical category values, for the form-based filter. */
  companyCategoryValues: Record<string, string[]>;
  /** companyId -> display name from the configured form field, if any. */
  companyNames: Record<string, string>;
  /** companyId -> master/faculty logo file ids, for the booth popup. */
  companyLogos: Record<string, string[]>;
};

function floorplanFieldConfig(page: CareerEventPage) {
  const fp = page.floorplan as {
    floorplan_category_form_fields?: FormFieldRef[] | null;
    floorplan_company_name_form_field?: FormFieldRef[] | FormFieldRef | null;
  } | null;
  const categoryFields = (fp?.floorplan_category_form_fields ?? []).filter(
    (f) => f?.formId && f?.fieldName
  );
  const raw = fp?.floorplan_company_name_form_field;
  const nameFields = (Array.isArray(raw) ? raw : raw && typeof raw === "object" && raw.formId ? [raw] : [])
    .filter((f) => f?.formId && f?.fieldName);
  return { categoryFields, nameFields };
}

function svgViewBox(svg: string): string {
  return svg.match(/<svg\b[^>]*?\sviewBox\s*=\s*["']([^"']+)["']/i)?.[1]?.trim() || "0 0 1000 600";
}

/**
 * The public floorplan of an event page, cached per event slug in the
 * floorplan cache (dropped when booths or the floorplan change). Null when the
 * page has no floorplan.
 */
export async function loadPublicFloorplan(
  page: CareerEventPage,
  eventSlug: string
): Promise<PublicFloorplan | null> {
  const cached = getCachedFloorplan(eventSlug) as PublicFloorplan | null;
  if (cached) return cached;

  const { categoryFields, nameFields } = floorplanFieldConfig(page);
  const useFormCategories = categoryFields.length > 0;

  const [base, categoryOptions, masters, categoryValues, nameMaps] = await Promise.all([
    loadFloorplanData(page),
    useFormCategories ? getFloorplanCategoryOptions(categoryFields) : Promise.resolve({ groups: [] }),
    useFormCategories ? Promise.resolve([] as Master[]) : listMasters({ limit: 300, sort: "name" }).then((m) => m ?? []),
    useFormCategories ? getCompanyFloorplanCategoryValues(categoryFields) : Promise.resolve(new Map<string, Set<string>>()),
    Promise.all(nameFields.map((f) => getCompanyFormFieldValuesFromForm(f.formId, f.fieldName))),
  ]);
  if (!base) return null;

  // The first configured name field that has a value wins.
  const companyNames: Record<string, string> = {};
  for (const map of nameMaps) {
    for (const [companyId, value] of Object.entries(map)) {
      if (value && !companyNames[companyId]) companyNames[companyId] = value;
    }
  }

  const companyIds = [...new Set(base.booths.map((b) => b.company?.id).filter((id): id is string => !!id))];
  const companyLogos =
    useFormCategories && companyIds.length > 0
      ? await getCompanyMasterDegreesFromFormBatch(categoryFields, companyIds)
      : {};

  const companyCategoryValues: Record<string, string[]> = {};
  for (const [companyId, values] of categoryValues) {
    companyCategoryValues[companyId] = [...values];
  }

  const result: PublicFloorplan = {
    svg: base.svg,
    svgFileId: String(page.floorplan!.svg_file),
    viewBox: svgViewBox(base.svg),
    backgroundImage: base.backgroundImage ?? null,
    booths: base.booths,
    useFormCategories,
    formCategoryGroups: categoryOptions.groups,
    categories: masters,
    companyCategoryValues,
    companyNames,
    companyLogos,
  };
  setCachedFloorplan(eventSlug, result);
  return result;
}
