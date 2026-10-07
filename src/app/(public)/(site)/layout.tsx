import { loadHomepageData } from "@/lib/homepage-data";
import { getUserFromCookies } from "@/lib/auth-server";
import { getStudentFromCookies } from "@/lib/auth-student";
import type { HeaderEvent } from "@/components/site/header-events";
import type { HeaderSession } from "@/components/site/header-session";
import { SiteShell } from "./site-shell";

/**
 * Loads what the header shows once per request, so it no longer fetches it
 * after hydrating: the events menu (published events, from the homepage cache)
 * and who is signed in. The session used to be a client-side check only, which
 * rendered the signed-out buttons first and swapped them a second or two
 * later. Reading the cookies makes every public page dynamic; there is no CDN
 * in front of the site and most of them already were.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [{ events }, headerSession] = await Promise.all([
    loadHomepageData().catch(() => ({ events: [] as HeaderEvent[] })),
    loadHeaderSession(),
  ]);
  // Only what the menu shows: this goes into every public page.
  const headerEvents: HeaderEvent[] = (events ?? []).map(({ id, name, date, location, href }) => ({
    id,
    name,
    date,
    location,
    href,
  }));
  return (
    <SiteShell headerEvents={headerEvents} headerSession={headerSession}>
      {children}
    </SiteShell>
  );
}

/**
 * The same answer /api/user/check gives, cut down to what the header renders.
 * A visitor without a session cookie costs no database query.
 */
async function loadHeaderSession(): Promise<HeaderSession> {
  const [user, student] = await Promise.all([
    getUserFromCookies().catch(() => undefined),
    getStudentFromCookies().catch(() => null),
  ]);
  return {
    companyRep:
      user?.id && user.email
        ? {
            authenticated: true,
            name: user.name || user.email,
            admin: user.admin || false,
            is_shifter: user.is_shifter || false,
          }
        : null,
    student:
      student?.id && student.email
        ? {
            authenticated: true,
            firstName: student.first_name || null,
            lastName: student.last_name || null,
            is_shifter: student.is_shifter || false,
          }
        : null,
  };
}
