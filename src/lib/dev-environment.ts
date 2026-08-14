import "server-only";

/**
 * Distinguishes the staging deployment (dev.career.vtk.be) from production
 * (career.vtk.be).
 *
 * Features that are finished enough to demo but not finished enough to ship sit
 * behind this flag, so non-technical staff can click through them on the dev
 * site and give feedback before they appear on the real one. Once dev and main
 * become separate branches this stays useful: it decouples "which code is
 * deployed" from "which features are visible", so a single image can be
 * promoted between environments without a rebuild.
 *
 * Resolved when the page renders. In practice that is per request: `next build`
 * reports every vacancy route as dynamic (server-rendered on demand), as it
 * does for almost all of this app, so the runtime variable is what decides what
 * a visitor sees. The Dockerfile also passes DEV_ENVIRONMENT as a build arg so
 * that any route which does get prerendered bakes in the right value rather
 * than silently defaulting to production -- keep the two settings equal.
 *
 * Anything other than "true" counts as production. Defaulting to off means a
 * missing or misspelled variable hides unfinished work rather than exposing it.
 */
export function isDevEnvironment(): boolean {
  return process.env.DEV_ENVIRONMENT?.trim().toLowerCase() === "true";
}
