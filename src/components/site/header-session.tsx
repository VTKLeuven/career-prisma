"use client";

import { createContext, useContext } from "react";

/** What the site header's account cluster needs to know about who is signed in. */
export type HeaderCompanyRep = { authenticated: boolean; name: string; is_shifter?: boolean; admin?: boolean };
export type HeaderStudent = {
  authenticated: boolean;
  firstName: string | null;
  lastName: string | null;
  is_shifter?: boolean;
};
export type HeaderSession = { companyRep: HeaderCompanyRep | null; student: HeaderStudent | null };

const HeaderSessionContext = createContext<HeaderSession | null>(null);

/**
 * The visitor's session, resolved by the site layout on the server -- the
 * header used to render the signed-out buttons and swap in the right ones only
 * once /api/user/check answered after hydrating, a visible flash on every page.
 */
export function HeaderSessionProvider({ session, children }: { session: HeaderSession; children: React.ReactNode }) {
  return <HeaderSessionContext.Provider value={session}>{children}</HeaderSessionContext.Provider>;
}

/** null outside the site layout; the header then starts signed out until its own check answers. */
export function useHeaderSession(): HeaderSession | null {
  return useContext(HeaderSessionContext);
}
