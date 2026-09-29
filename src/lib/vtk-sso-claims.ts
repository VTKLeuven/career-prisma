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
  /** Always the university address; the SSO owns it. */
  email: string;
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
  /** Academic year the study info was last confirmed for, e.g. 2025. */
  studyConfirmedYear?: number;
  /** True when the member does not study at FIIW/FirW. */
  notAtFaculty?: boolean;
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
  "vtk:student_number",
  "vtk:study_programmes",
  "vtk:study_years",
  "vtk:study_confirmed_year",
  "vtk:not_at_faculty",
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
  "locale",
  "updated_at",
  "email_verified",
  "vtk:onboarded",
  "vtk:preferred_email",
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

  const email = asString(claims.email)?.toLowerCase();
  if (!email) {
    return { error: "The SSO returned no `email` claim — is the `email` scope granted?" };
  }

  const firstName = asString(claims.given_name);
  const lastName = asString(claims.family_name);
  const fullName =
    asString(claims.name) ??
    ([firstName, lastName].filter(Boolean).join(" ") || undefined);

  // `username` is NOT NULL and unique in the students table. `preferred_username`
  // is granted with `profile` and should always be there, but fall through to
  // the email local part and then the subject, which is unique by construction.
  const username =
    asString(claims.preferred_username) ?? email.split("@")[0] ?? subject;

  return {
    subject,
    email,
    username,
    fullName,
    firstName,
    lastName,
    studentNumber: asString(claims["vtk:student_number"]),
    studyProgrammes: asStringArray(claims["vtk:study_programmes"]),
    studyYears: asStringArray(claims["vtk:study_years"]),
    studyConfirmedYear: asNumber(claims["vtk:study_confirmed_year"]),
    notAtFaculty: asBoolean(claims["vtk:not_at_faculty"]),
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
