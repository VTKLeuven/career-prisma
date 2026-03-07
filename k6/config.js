// Central configuration for all k6 stress tests.
// Override any value via environment variables when running k6.

export const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

// Directus URL (used for direct backend pressure testing)
export const DIRECTUS_URL = __ENV.DIRECTUS_URL || "http://localhost:8055";

// Auth cookie prefix (must match your .env / next.config)
export const AUTH_COOKIE_PREFIX = __ENV.AUTH_COOKIE_PREFIX || "directus";

// ---------------------------------------------------------------------------
// Test credentials – create dedicated load-test accounts in Directus first!
// NEVER use real production credentials here.
// Supports both COMPANY_REP_* and K6_COMPANY_REP_* (matches .env naming).
// k6 does NOT load .env – run with: set -a && source .env && set +a && k6 run ...
// or use: ./k6/run-stress-test.sh
// ---------------------------------------------------------------------------
export const COMPANY_REP_EMAIL =
  __ENV.COMPANY_REP_EMAIL || __ENV.K6_COMPANY_REP_EMAIL || "loadtest-company@example.com";
export const COMPANY_REP_PASSWORD =
  __ENV.COMPANY_REP_PASSWORD || __ENV.K6_COMPANY_REP_PASSWORD || "loadtest123";

export const STUDENT_EMAIL =
  __ENV.STUDENT_EMAIL || __ENV.K6_STUDENT_EMAIL || "loadtest-student@example.com";
export const STUDENT_PASSWORD =
  __ENV.STUDENT_PASSWORD || __ENV.K6_STUDENT_PASSWORD || "loadtest123";

// ---------------------------------------------------------------------------
// Test data IDs – replace these with real IDs from your Directus instance
// ---------------------------------------------------------------------------
export const TEST_EVENT_SLUG = __ENV.TEST_EVENT_SLUG || "jobfair-2026";
export const TEST_ATTENDANT_UUIDS = (__ENV.TEST_ATTENDANT_UUIDS || "").split(",").filter(Boolean);
export const TEST_BOOTH_IDS = (__ENV.TEST_BOOTH_IDS || "").split(",").filter(Boolean);
export const TEST_DRINK_IDS = (__ENV.TEST_DRINK_IDS || "").split(",").filter(Boolean);
export const TEST_CV_FILE_IDS = (__ENV.TEST_CV_FILE_IDS || "").split(",").filter(Boolean);

// ---------------------------------------------------------------------------
// Thresholds (shared across scenarios)
// ---------------------------------------------------------------------------
export const DEFAULT_THRESHOLDS = {
  http_req_duration: ["p(95)<2000", "p(99)<5000"],
  http_req_failed: ["rate<0.05"],
};
