/**
 * Role ids, safe to import from client components.
 *
 * The names are misleading -- "VTK Career" is the salesperson role and
 * "Administrator" is the unadvertised internal one -- so everything matches on
 * the id. See docs/auth.md.
 *
 * The authorization copies in `src/app/api/login/route.ts` and
 * `src/lib/auth-server.ts` deliberately keep their own literals: those two are
 * the security boundary and are documented as such. Use this module for UI that
 * only needs to know which role a form row is on.
 */
export const ROLE_VTK_CAREER = "7b128ef4-f530-47d2-8f4c-ef82518eb313";
export const ROLE_ADMINISTRATOR = "c4e63615-ed81-45d1-8145-1b88137e60cb";
export const ROLE_COMPANY_REP = "d5475bf4-a77f-48de-b06c-fac199b0f631";

/** The two internal roles: full access, and the only ones with a team card. */
export const INTERNAL_ROLE_IDS: readonly string[] = [
  ROLE_VTK_CAREER,
  ROLE_ADMINISTRATOR,
];
