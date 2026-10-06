// lib/matching-students.ts -- the matched students stored on a company's
// matching response. Read by the company matching form and, on the server,
// by its page.

export type MatchedStudent = { id: string; first_name: string | null; last_name: string | null; email: string };

/** The response's `students` as a list, whether stored as ids, objects or `{ data }`. */
export function normalizeStudents(raw: unknown): MatchedStudent[] {
  if (!raw) return [];
  let arr: unknown[] = [];
  if (Array.isArray(raw)) arr = raw;
  else if (typeof raw === "object" && raw !== null && "data" in raw && Array.isArray((raw as { data: unknown }).data)) {
    arr = (raw as { data: unknown[] }).data;
  } else return [];
  return arr
    .map((item): MatchedStudent | null => {
      if (item == null) return null;
      if (typeof item === "string") return { id: item, first_name: null, last_name: null, email: "" };
      if (typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id : typeof o.id === "number" ? String(o.id) : null;
      if (!id) return null;
      const first_name = o.first_name != null ? String(o.first_name) : null;
      const last_name = o.last_name != null ? String(o.last_name) : null;
      const email = typeof o.email === "string" ? o.email : "";
      return { id, first_name, last_name, email };
    })
    .filter((s): s is MatchedStudent => s !== null);
}
