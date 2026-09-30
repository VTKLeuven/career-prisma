// lib/vtk-sso-claims.ts — the one place that knows what the VTK SSO calls things.
//
// Everything else in the SSO flow works with `SsoProfile`. When the provider's
// claim registry changes, this file is the only edit. That is the whole point
// of it being separate from `vtk-sso.ts`.
//
// Claim names and shapes are taken from the provider's registry
// (`packages/auth/src/lib/claims.ts` and `server/claims.ts` on the VTK site),
// not guessed. Three things about that contract are easy to get wrong and are
// therefore encoded here rather than at the call sites:
//
//  1. **Claims are absent, never null.** The resolver drops a claim whose
//     value is null or undefined, so "no address" means no `address` key.
//     A missing claim therefore means "not granted or not known" — it must
//     never be written to the database as a blank.
//  2. **Study claims are arrays**, of lowercased enum values
//     (`["computer_science", "cybersecurity"]`), not single strings.
//  3. **The ID token carries only `profile` and `email` claims.** Everything
//     under `vtk:*` exists in userinfo only, which is why the flow always
//     calls the userinfo endpoint instead of stopping at the ID token.

import type { Claims } from "@/lib/vtk-sso";

/** What the flow needs out of a set of claims, provider vocabulary stripped. */
export interface SsoProfile {
  /** OIDC `sub` — the SSO's user id. The identity we store and match on first. */
  subject: string;
  /**
   * The address Career stores and mails: the member's preferred address on
   * vtk.be (`vtk:preferred_email` — their personal one if they chose it),
   * falling back to `loginEmail`.
   */
  email: string;
  /**
   * The vtk.be login address (`email`). Usually the KU Leuven one, but not
   * always: it can be a private address, and a vtk.be admin can change it.
   * Only used to match a returning student whose row still carries it.
   */
  loginEmail: string;
  /** For rows this flow creates: the r-number, else the login email. Never `preferred_username`. */
  username: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  /** r-number, e.g. "r0812345". Matches a returning student to their pre-SSO row. */
  studentNumber?: string;
  /** Lowercased enum values, e.g. ["computer_science", "cybersecurity"]. */
  studyProgrammes?: string[];
  /** Lowercased enum values, e.g. ["master_1"]. */
  studyYears?: string[];
  /** Start year of the academic year the study info was last confirmed for: 2026 = 2026-2027. */
  studyConfirmedYear?: number;
  /**
   * Self-declared "I am not studying at the faculty". Independent of the
   * programmes: it can come with a non-empty `studyProgrammes`.
   */
  notAtFaculty?: boolean;
  /** vtk.be's interface language, "nl-BE" or "en". Seeds the preferred language. */
  locale?: string;
}

/**
 * Claim keys this app reads. Kept as one list so `unmappedClaims()` can report
 * anything new the provider starts sending.
 */
const MAPPED_CLAIMS = [
  "sub",
  "name",
  "given_name",
  "family_name",
  "preferred_username",
  "email",
  "vtk:preferred_email",
  "vtk:student_number",
  "vtk:study_programmes",
  "vtk:study_years",
  "vtk:study_confirmed_year",
  "vtk:not_at_faculty",
  "locale",
] as const;

/**
 * Claims we knowingly ignore: protocol plumbing, and payload from scopes we do
 * not request but might receive anyway if the client registration is widened.
 */
const IGNORED_CLAIMS = new Set([
  // Protocol — set by the plugin, never by the claim registry.
  "iss",
  "aud",
  "azp",
  "exp",
  "iat",
  "nbf",
  "jti",
  "nonce",
  "auth_time",
  "at_hash",
  "scope",
  // Granted by scopes we request, but of no use to Career.
  "picture",
  "updated_at",
  "email_verified",
  "vtk:onboarded",
  // Only present if someone widens the client's scopes later.
  "address",
  "birthdate",
  "vtk:personal_email",
  "vtk:email_preference",
  "permissions",
]);

/** Coerces a claim to a trimmed non-empty string. */
function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

/**
 * Coerces an enum-array claim. Absent stays absent (the student did not grant
 * the scope); an empty array stays an empty array (they granted it and have
 * nothing on file) — the two mean different things downstream.
 */
function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((entry) => asString(entry))
    .filter((entry): entry is string => entry !== undefined);
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

/**
 * Builds a profile from the merged ID-token and userinfo claims. Returns a
 * reason instead of a profile when the claims cannot identify a student at
 * all — without `sub` and an email there is nothing a caller can do.
 */
export function toSsoProfile(claims: Claims): SsoProfile | { error: string } {
  const subject = asString(claims.sub);
  if (!subject) return { error: "The SSO returned no `sub` claim" };

  const loginEmail = asString(claims.email)?.toLowerCase();
  if (!loginEmail) {
    return { error: "The SSO returned no `email` claim — is the `email` scope granted?" };
  }

  const firstName = asString(claims.given_name);
  const lastName = asString(claims.family_name);
  const fullName =
    asString(claims.name) ??
    ([firstName, lastName].filter(Boolean).join(" ") || undefined);

  // vtk.be lowercases r-numbers from KU Leuven and self-entry, but values an
  // admin typed or bulk-imported are only trimmed — `R0123456` exists there.
  const studentNumber = asString(claims["vtk:student_number"])?.toLowerCase();

  // `username` is NOT NULL and unique in the students table, and only matters
  // for rows this flow creates. NOT `preferred_username`: vtk.be derives it
  // from the email's local part, so it is not unique across domains, and two
  // students called `jan` would collide. The r-number is what LITUS-era rows
  // carry as their username; the login email is unique in both systems (the
  // preferred one is not unique on vtk.be).
  const username = studentNumber ?? loginEmail;

  // Always sent in userinfo; equal to `email` unless the member chose a
  // personal address on vtk.be.
  const email = asString(claims["vtk:preferred_email"])?.toLowerCase() ?? loginEmail;

  return {
    subject,
    email,
    loginEmail,
    username,
    fullName,
    firstName,
    lastName,
    studentNumber,
    studyProgrammes: asStringArray(claims["vtk:study_programmes"]),
    studyYears: asStringArray(claims["vtk:study_years"]),
    studyConfirmedYear: asNumber(claims["vtk:study_confirmed_year"]),
    notAtFaculty: asBoolean(claims["vtk:not_at_faculty"]),
    locale: asString(claims.locale),
  };
}

/**
 * Claim keys we received but map nowhere. Logged once per login so a change to
 * the provider's registry surfaces as a log line rather than as a column that
 * quietly stopped updating.
 */
export function unmappedClaims(claims: Claims): string[] {
  const known = new Set<string>([...IGNORED_CLAIMS, ...MAPPED_CLAIMS]);
  return Object.keys(claims).filter((key) => !known.has(key));
}
