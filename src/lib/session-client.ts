/**
 * The visitor's session as /api/user/check reports it, for public pages (the
 * public site has no server-side user, so its pages stay cacheable).
 *
 * Several components ask at the same moment -- the site header, the
 * liked-companies provider, the page itself -- so concurrent calls share one
 * request. Results are deliberately not cached beyond that: after signing in
 * or out the next check must see the change.
 */
export type SessionCheck = {
  companyRep: {
    authenticated: true;
    company: { id: string; name?: string | null } | null;
    admin: boolean;
    name: string;
    email: string;
    is_shifter: boolean;
  } | null;
  student: {
    authenticated: true;
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    is_shifter: boolean;
    likedCompanyIds?: string[];
  } | null;
};

const SIGNED_OUT: SessionCheck = { companyRep: null, student: null };

let inflight: Promise<SessionCheck> | null = null;

export function fetchSessionCheck(): Promise<SessionCheck> {
  if (!inflight) {
    inflight = fetch("/api/user/check", { cache: "no-store", credentials: "include" })
      .then((res) => (res.ok ? (res.json() as Promise<SessionCheck>) : SIGNED_OUT))
      .catch(() => SIGNED_OUT)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
