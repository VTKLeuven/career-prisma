// lib/site-path.ts — keeps links to our own pages relative.
//
// The student session cookie is host-only, so an absolute link to
// `https://www.career.vtk.be/...` from `career.vtk.be` (or from dev to prod)
// arrives without the session and bounces a signed-in student through the SSO.
// A relative path always stays on the host the student is signed in on.

const OWN_HOST = /^https?:\/\/(?:[a-z0-9-]+\.)*career\.vtk\.be(?::\d+)?(?=[/?#]|$)/i;

/** Turns a link to any career.vtk.be host into a path; leaves other links alone. */
export function toSitePath(link: string): string {
  const trimmed = link.trim();
  if (!OWN_HOST.test(trimmed)) return trimmed;
  const path = trimmed.replace(OWN_HOST, "");
  return path.startsWith("/") ? path : `/${path}`;
}

/** The public URL of a student-facing form. */
export function formPath(slug: string): string {
  return `/forms/${encodeURIComponent(slug)}`;
}
