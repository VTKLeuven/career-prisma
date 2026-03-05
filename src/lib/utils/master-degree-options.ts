/**
 * Build master-degree options for forms and floorplan.
 * Shared logic for server-side option building.
 */
import type { Master, Faculty } from "@/lib/schema";

type MasterOption = { value: string; label: string; logo?: string };

export type FacultyItem = {
  id: string;
  name: string;
  logo?: string;
  masters?: Array<{ master_id: Master | string | null } | Master>;
};

/** Normalize raw faculty from API (may have faculty_master, faculty_masters) to FacultyItem with masters. */
export function normalizeFaculties(faculties: unknown[] | null): FacultyItem[] | null {
  if (!faculties || !Array.isArray(faculties)) return null;
  const arr = faculties as Record<string, unknown>[];
  return arr.map((f) => {
    const masters =
      Array.isArray(f.masters) ? f.masters :
      Array.isArray(f.faculty_master) ? f.faculty_master :
      Array.isArray(f.faculty_masters) ? f.faculty_masters : [];
    return { ...f, masters } as FacultyItem;
  });
}

export function buildMasterDegreeOptions(
  masters: Master[],
  faculties: FacultyItem[] | null,
  includeFaculties: boolean
): MasterOption[] {
  if (!includeFaculties || !faculties || faculties.length === 0) {
    return masters.map((m) => ({ value: m.id, label: m.name, logo: m.logo }));
  }
  const isOtherFaculty = (name: string) => /^others?$/i.test((name ?? "").trim());
  const sortedFaculties = [...faculties].sort((a, b) => {
    const aName = (a.name ?? "").toLowerCase();
    const bName = (b.name ?? "").toLowerCase();
    const aIsOther = isOtherFaculty(a.name ?? "");
    const bIsOther = isOtherFaculty(b.name ?? "");
    if (aIsOther && !bIsOther) return 1;
    if (!aIsOther && bIsOther) return -1;
    if (aIsOther && bIsOther) return 0;
    const aHasMasters = (a.masters ?? []).length > 0;
    const bHasMasters = (b.masters ?? []).length > 0;
    if (aHasMasters && !bHasMasters) return -1;
    if (!aHasMasters && bHasMasters) return 1;
    return 0;
  });
  const options: MasterOption[] = [];
  const canonicalOther = "Other";
  for (const faculty of sortedFaculties) {
    const facultyName = faculty.name ?? "";
    const isOther = isOtherFaculty(facultyName);
    const mastersList = faculty.masters ?? [];
    const resolvedMasters: Master[] = mastersList
      .map((item) => {
        if (item && typeof item === "object" && "master_id" in item) {
          const mid = (item as { master_id: Master | string | null }).master_id;
          if (mid && typeof mid === "object" && "id" in mid) return mid as Master;
          if (mid && typeof mid === "string") return masters.find((x) => x.id === mid) ?? null;
          return null;
        }
        return item as Master;
      })
      .filter((m): m is Master => m != null && typeof m === "object" && "id" in m && "name" in m);

    if (resolvedMasters.length === 0) {
      options.push({
        value: `fac:${faculty.id}`,
        label: isOther ? canonicalOther : `Fac. ${facultyName}`,
        logo: faculty.logo,
      });
    } else {
      for (const m of resolvedMasters) {
        options.push({
          value: `fac:${faculty.id}:${m.id}`,
          label: m.name, // Show master name only
          logo: m.logo,
        });
      }
    }
  }
  return options;
}

/** Normalize for matching: trim, collapse spaces, lowercase, strip brackets. Treat "others" same as "other". */
function normalizeForMatch(s: string): string {
  let r = (s ?? "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\{[^}]*\}/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
  if (r === "others") return "other";
  return r;
}

/** Build options with FormFieldRenderer label format (Fac. X - Y) for matching stored labels. */
export function buildMasterDegreeOptionsForForm(
  masters: Master[],
  faculties: FacultyItem[] | null,
  includeFaculties: boolean
): MasterOption[] {
  if (!includeFaculties || !faculties || faculties.length === 0) {
    return masters.map((m) => ({ value: m.id, label: m.name, logo: m.logo }));
  }
  const isOtherFaculty = (name: string) => /^others?$/i.test((name ?? "").trim());
  const sortedFaculties = [...faculties].sort((a, b) => {
    const aName = (a.name ?? "").toLowerCase();
    const bName = (b.name ?? "").toLowerCase();
    const aIsOther = isOtherFaculty(a.name ?? "");
    const bIsOther = isOtherFaculty(b.name ?? "");
    if (aIsOther && !bIsOther) return 1;
    if (!aIsOther && bIsOther) return -1;
    if (aIsOther && bIsOther) return 0;
    const aHasMasters = (a.masters ?? []).length > 0;
    const bHasMasters = (b.masters ?? []).length > 0;
    if (aHasMasters && !bHasMasters) return -1;
    if (!aHasMasters && bHasMasters) return 1;
    return aName.localeCompare(bName);
  });
  const options: MasterOption[] = [];
  for (const faculty of sortedFaculties) {
    const facultyName = faculty.name ?? "";
    const isOther = isOtherFaculty(facultyName);
    const mastersList = faculty.masters ?? [];
    const resolvedMasters: Master[] = mastersList
      .map((item) => {
        if (item && typeof item === "object" && "master_id" in item) {
          const mid = (item as { master_id: Master | string | null }).master_id;
          if (mid && typeof mid === "object" && "id" in mid) return mid as Master;
          if (mid && typeof mid === "string") return masters.find((x) => x.id === mid) ?? null;
          return null;
        }
        return item as Master;
      })
      .filter((m): m is Master => m != null && typeof m === "object" && "id" in m && "name" in m);
    if (resolvedMasters.length === 0) {
      options.push({
        value: `fac:${faculty.id}`,
        label: isOther ? "Other" : `Fac. ${facultyName}`,
        logo: faculty.logo,
      });
    } else {
      for (const m of resolvedMasters) {
        options.push({
          value: `fac:${faculty.id}:${m.id}`,
          label: isOther ? `${facultyName} - ${m.name}` : `Fac. ${facultyName} - ${m.name}`,
          logo: m.logo,
        });
      }
    }
  }
  return options;
}

function extractItemString(item: unknown): string | null {
  if (item == null) return null;
  if (typeof item === "string" && item.trim()) return item.trim();
  if (typeof item === "object" && item !== null) {
    const o = item as Record<string, unknown>;
    const v = o.id ?? o.value ?? o.name ?? o.label;
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}

/** Resolve a stored master-degrees value to display label (e.g. "Fac. Engineering - Architectural Engineering"). */
export function resolveMasterDegreeValueToDisplayLabel(
  value: unknown,
  masters: Master[],
  faculties: FacultyItem[] | null
): string {
  const s = extractItemString(value);
  if (!s) return "";
  const idEq = (a: unknown, b: string) => a != null && String(a) === String(b);

  // fac:facId:masterId
  const facMasterMatch = s.match(/^fac:([^:]+):([^:]+)$/);
  if (facMasterMatch) {
    const [, facId, masterId] = facMasterMatch;
    const f = faculties?.find((x) => idEq(x.id, facId));
    const m = masters.find((x) => idEq(x.id, masterId));
    if (f && m) {
      const isOther = /^others?$/i.test((f.name ?? "").trim());
      return isOther ? `Other - ${m.name}` : `Fac. ${f.name ?? ""} - ${m.name}`;
    }
    if (m) return m.name;
    if (f) return /^others?$/i.test((f.name ?? "").trim()) ? "Other" : `Fac. ${f.name ?? ""}`;
    return s;
  }

  // fac:facId
  const facMatch = s.match(/^fac:([^:]+)$/);
  if (facMatch) {
    const f = faculties?.find((x) => idEq(x.id, facMatch[1]));
    if (f) return /^others?$/i.test((f.name ?? "").trim()) ? "Other" : `Fac. ${f.name ?? ""}`;
    return s;
  }

  // Plain master UUID or numeric ID
  const m = masters.find((x) => idEq(x.id, s));
  if (m) return m.name;

  // Already label format (e.g. "Fac. X - Y") or other - return as is
  return s;
}

/** Normalize master-degrees value(s) from label format to canonical (fac:facId:masterId). Returns normalized array. */
export function normalizeMasterDegreesValues(
  value: unknown,
  options: MasterOption[],
  _isMultiple: boolean,
  ctx?: { masters: Master[]; faculties: FacultyItem[] | null }
): string[] {
  const items = Array.isArray(value) ? value : value != null && value !== "" ? [value] : [];
  const normalized: string[] = [];
  const norm = (x: string) => normalizeForMatch(x);
  for (const item of items) {
    const s = extractItemString(item);
    if (!s) continue;
    if (/^fac:[^:]+:[^:]+$/.test(s) || /^fac:[^:]+$/.test(s) || /^[0-9a-f-]{36}$/i.test(s)) {
      normalized.push(s);
      continue;
    }
    let opt = options.find(
      (o) =>
        o.value === s ||
        o.label === s ||
        norm(o.value) === norm(s) ||
        norm(o.label) === norm(s) ||
        (s.includes(" - ") && (o.label === s.split(" - ").pop()?.trim() || norm(o.label) === norm(s.split(" - ").pop() ?? "")))
    );
    if (!opt && /^others?$/i.test(s) && ctx?.faculties) {
      const otherFaculty = ctx.faculties.find((f) => /^others?$/i.test((f.name ?? "").trim()));
      if (otherFaculty) {
        opt = { value: `fac:${otherFaculty.id}`, label: "Other", logo: otherFaculty.logo };
      }
    }
    if (!opt && s.includes(" - ") && ctx?.masters && ctx?.faculties) {
      const masterNamePart = s.split(" - ").pop()?.trim();
      if (masterNamePart) {
        const m = ctx.masters.find((x) => norm(x.name) === norm(masterNamePart));
        if (m) {
          for (const f of ctx.faculties ?? []) {
            const mastersList = f.masters ?? [];
            for (const it of mastersList) {
              let masterId: string | null = null;
              if (it && typeof it === "object" && "master_id" in it) {
                const mid = (it as { master_id: Master | string | null }).master_id;
                if (mid && typeof mid === "object" && "id" in mid) masterId = (mid as Master).id;
                else if (mid && typeof mid === "string") masterId = mid;
              } else if (it && typeof it === "object" && "id" in it) {
                masterId = (it as Master).id;
              }
              if (masterId === m.id) {
                opt = { value: `fac:${f.id}:${m.id}`, label: s, logo: m.logo };
                break;
              }
            }
            if (opt) break;
          }
        }
      }
    }
    if (opt) {
      normalized.push(opt.value);
    } else {
      normalized.push(s);
    }
  }
  return normalized;
}

export type MasterOptionGroup = { groupLabel: string; options: MasterOption[] };

/** Build master-degree options grouped by faculty. When includeFaculties: one group per faculty; when not: single "Masters" group. */
export function buildMasterDegreeOptionsGrouped(
  masters: Master[],
  faculties: FacultyItem[] | null,
  includeFaculties: boolean
): MasterOptionGroup[] {
  if (!includeFaculties || !faculties || faculties.length === 0) {
    return [{ groupLabel: "Masters", options: masters.map((m) => ({ value: m.id, label: m.name, logo: m.logo })) }];
  }
  const isOtherFaculty = (name: string) => /^others?$/i.test((name ?? "").trim());
  const sortedFaculties = [...faculties].sort((a, b) => {
    const aName = (a.name ?? "").toLowerCase();
    const bName = (b.name ?? "").toLowerCase();
    const aIsOther = isOtherFaculty(a.name ?? "");
    const bIsOther = isOtherFaculty(b.name ?? "");
    if (aIsOther && !bIsOther) return 1;
    if (!aIsOther && bIsOther) return -1;
    if (aIsOther && bIsOther) return 0;
    const aHasMasters = (a.masters ?? []).length > 0;
    const bHasMasters = (b.masters ?? []).length > 0;
    if (aHasMasters && !bHasMasters) return -1;
    if (!aHasMasters && bHasMasters) return 1;
    return aName.localeCompare(bName);
  });
  const groupsByLabel = new Map<string, MasterOption[]>();
  const canonicalOther = "Other";
  for (const faculty of sortedFaculties) {
    const facultyName = faculty.name ?? "";
    const isOther = isOtherFaculty(facultyName);
    const groupLabel = isOther ? canonicalOther : `Fac. ${facultyName}`;
    const mastersList = faculty.masters ?? [];
    const resolvedMasters: Master[] = mastersList
      .map((item) => {
        if (item && typeof item === "object" && "master_id" in item) {
          const mid = (item as { master_id: Master | string | null }).master_id;
          if (mid && typeof mid === "object" && "id" in mid) return mid as Master;
          if (mid && typeof mid === "string") return masters.find((x) => x.id === mid) ?? null;
          return null;
        }
        return item as Master;
      })
      .filter((m): m is Master => m != null && typeof m === "object" && "id" in m && "name" in m);

    const opts: MasterOption[] =
      resolvedMasters.length === 0
        ? [{
            value: `fac:${faculty.id}`,
            label: isOther ? canonicalOther : `Fac. ${facultyName}`,
            logo: faculty.logo,
          }]
        : resolvedMasters.map((m) => ({
            value: `fac:${faculty.id}:${m.id}`,
            label: m.name,
            logo: m.logo,
          }));

    const existing = groupsByLabel.get(groupLabel) ?? [];
    const seenValues = new Set(existing.map((o) => o.value));
    const newOpts = opts.filter((o) => !seenValues.has(o.value));
    groupsByLabel.set(groupLabel, existing.length === 0 ? opts : [...existing, ...newOpts]);
  }
  return Array.from(groupsByLabel.entries()).map(([groupLabel, options]) => ({ groupLabel, options }));
}

/** Extract logo ID from Directus file field (can be string UUID or { id: string }). */
export function extractLogoId(logo: unknown): string | undefined {
  if (!logo) return undefined;
  if (typeof logo === "string" && logo.trim()) return logo.trim();
  if (typeof logo === "object" && logo !== null && "id" in logo) {
    const id = (logo as { id?: string }).id;
    return typeof id === "string" && id.trim() ? id.trim() : undefined;
  }
  return undefined;
}

/** Resolve a master-degrees value to logo(s). When faculty has masters, returns master logos; otherwise faculty/master logo. */
export function resolveLogosForValue(
  value: string,
  masters: Master[],
  faculties: FacultyItem[] | null
): string[] {
  if (!value || typeof value !== "string") return [];
  const v = value.trim();
  const result: string[] = [];

  // fac:facultyId:masterId (specific master under a faculty)
  const facMasterMatch = v.match(/^fac:([^:]+):([^:]+)$/);
  if (facMasterMatch) {
    const [, facId, masterId] = facMasterMatch;
    const f = faculties?.find((x) => x.id === facId);
    if (f?.masters) {
      for (const item of f.masters) {
        let m: Master | null = null;
        if (item && typeof item === "object" && "master_id" in item) {
          const mid = (item as { master_id: Master | string | null }).master_id;
          if (mid && typeof mid === "object" && "id" in mid) m = mid as Master;
          else if (mid && typeof mid === "string" && mid === masterId) m = masters.find((x) => x.id === masterId) ?? null;
        } else if (item && typeof item === "object" && "id" in item) {
          m = item as Master;
        }
        if (m && m.id === masterId) {
          const logo = extractLogoId(m.logo);
          if (logo) result.push(logo);
          return result;
        }
      }
    }
    const m = masters.find((x) => x.id === masterId);
    const logo = extractLogoId(m?.logo);
    if (logo) result.push(logo);
    return result;
  }

  // fac:facultyId (faculty) - if faculty has masters, show master logos; else faculty logo
  const facMatch = v.match(/^fac:([^:]+)$/);
  if (facMatch) {
    const [, facId] = facMatch;
    const f = faculties?.find((x) => x.id === facId);
    if (!f) return [];
    const resolvedMasters: Master[] = [];
    for (const item of f.masters ?? []) {
      if (item && typeof item === "object" && "master_id" in item) {
        const mid = (item as { master_id: Master | string | null }).master_id;
        if (mid && typeof mid === "object" && "id" in mid) resolvedMasters.push(mid as Master);
        else if (mid && typeof mid === "string") {
          const m = masters.find((x) => x.id === mid);
          if (m) resolvedMasters.push(m);
        }
      } else if (item && typeof item === "object" && "id" in item) {
        resolvedMasters.push(item as Master);
      }
    }
    if (resolvedMasters.length > 0) {
      for (const m of resolvedMasters) {
        const logo = extractLogoId(m.logo);
        if (logo) result.push(logo);
      }
      return result;
    }
    const logo = extractLogoId(f.logo);
    if (logo) result.push(logo);
    return result;
  }

  // Label format "Fac. FacultyName - MasterName" - extract master name and resolve
  const facDashMatch = v.match(/^fac\.?\s*.+\s*-\s*(.+)$/i);
  if (facDashMatch) {
    const masterNamePart = facDashMatch[1].trim();
    const norm = (s: string) => (s ?? "").trim().toLowerCase();
    const m = masters.find((x) => norm(x.name) === norm(masterNamePart));
    if (m) {
      const logo = extractLogoId(m.logo);
      if (logo) result.push(logo);
      return result;
    }
    return result;
  }

  // Master or faculty name (e.g. "Architectural Engineering", "Fac. Engineering", "Engineering Science", "Other", "Others")
  const norm = (s: string) => {
    const r = (s ?? "").trim().toLowerCase();
    return r === "others" ? "other" : r;
  };
  const m = masters.find((x) => norm(x.name) === norm(v));
  if (m) {
    const logo = extractLogoId(m.logo);
    if (logo) result.push(logo);
    return result;
  }
  const facultyNameMatch = v.match(/^fac\.?\s*(.+)$/i);
  const facultyNameToFind = facultyNameMatch ? facultyNameMatch[1].trim() : v;
  const f = faculties?.find((x) => norm(x.name) === norm(facultyNameToFind) || norm(`Fac. ${x.name}`) === norm(v));
  if (f) {
    const resolvedMasters: Master[] = [];
    for (const item of f.masters ?? []) {
      if (item && typeof item === "object" && "master_id" in item) {
        const mid = (item as { master_id: Master | string | null }).master_id;
        if (mid && typeof mid === "object" && "id" in mid) resolvedMasters.push(mid as Master);
        else if (mid && typeof mid === "string") {
          const master = masters.find((x) => x.id === mid);
          if (master) resolvedMasters.push(master);
        }
      } else if (item && typeof item === "object" && "id" in item) {
        resolvedMasters.push(item as Master);
      }
    }
    if (resolvedMasters.length > 0) {
      for (const master of resolvedMasters) {
        const logo = extractLogoId(master.logo);
        if (logo) result.push(logo);
      }
      return result;
    }
    const logo = extractLogoId(f.logo);
    if (logo) result.push(logo);
    return result;
  }

  // Plain master ID (uuid) or faculty ID (when stored without fac: prefix)
  if (/^[0-9a-f-]{36}$/i.test(v)) {
    const m = masters.find((x) => x.id === v);
    if (m) {
      const logo = extractLogoId(m.logo);
      if (logo) result.push(logo);
      return result;
    }
    const f = faculties?.find((x) => x.id === v);
    if (f) {
      const resolvedMasters: Master[] = [];
      for (const item of f.masters ?? []) {
        if (item && typeof item === "object" && "master_id" in item) {
          const mid = (item as { master_id: Master | string | null }).master_id;
          if (mid && typeof mid === "object" && "id" in mid) resolvedMasters.push(mid as Master);
          else if (mid && typeof mid === "string") {
            const master = masters.find((x) => x.id === mid);
            if (master) resolvedMasters.push(master);
          }
        } else if (item && typeof item === "object" && "id" in item) {
          resolvedMasters.push(item as Master);
        }
      }
      for (const m of resolvedMasters) {
        const logo = extractLogoId(m.logo);
        if (logo) result.push(logo);
      }
      if (resolvedMasters.length > 0) return result;
      const logo = extractLogoId(f.logo);
      if (logo) result.push(logo);
    }
    return result;
  }
  return [];
}

/** @deprecated Use resolveLogosForValue. Single-logo fallback for backward compat. */
export function resolveLogoForValue(
  value: string,
  masters: Master[],
  faculties: FacultyItem[] | null
): string | undefined {
  const logos = resolveLogosForValue(value, masters, faculties);
  return logos[0];
}
