import { loadHomepageData } from "@/lib/homepage-data";
import { getUserFromCookies } from "@/lib/auth-server";
import { getStudentFromCookies } from "@/lib/auth-student";
import type { HeaderEvent } from "@/components/site/header-events";
import type { HeaderSession } from "@/components/site/header-session";
import { shouldAutoRelogin } from "@/lib/vtk-sso";
import { SiteShell } from "./site-shell";

/**
 * Sends the browser through the SSO, back to the page it asked for. Inline
 * and first in the body, so it runs while the HTML is still being parsed —
 * before the signed-out page paints or any script loads. A layout is not told
 * its URL, which is why this is a script and not a `redirect()`; it runs only
 * on a full page load, never on a client-side navigation, which is what
 * "every time you open the site" means. Static text: nothing from the request
 * goes into it.
 */
const AUTO_RELOGIN_SCRIPT =
  'location.replace("/api/auth/oauth/initiate?silent=1&redirect_to="+encodeURIComponent(location.pathname+location.search))';

/**
 * Loads what the header shows once per request, so it no longer fetches it
 * after hydrating: the events menu (published events, from the homepage cache)
 * and who is signed in. The session used to be a client-side check only, which
 * rendered the signed-out buttons first and swapped them a second or two
 * later. Reading the cookies makes every public page dynamic; there is no CDN
 * in front of the site and most of them already were.
 *
 * It is also where an SSO student's expired 24-hour session is renewed without
 * a click: every public page load passes through here, so when the session is
 * gone but the `student_sso` hint is not, the page bounces through vtk.be and
 * comes back signed in (`shouldAutoRelogin`, `docs/auth.md`). Before, only
 * `/student-login` did this, so a student had to press "Student login" daily.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [{ events }, headerSession, autoRelogin] = await Promise.all([
    loadHomepageData().catch(() => ({ events: [] as HeaderEvent[] })),
    loadHeaderSession(),
    shouldAutoRelogin().catch(() => false),
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
    <>
      {autoRelogin && <script dangerouslySetInnerHTML={{ __html: AUTO_RELOGIN_SCRIPT }} />}
      <SiteShell headerEvents={headerEvents} headerSession={headerSession}>
        {children}
      </SiteShell>
    </>
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
