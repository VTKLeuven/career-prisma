/**
 * k6 Smoke Test — Quick login + scan verification
 *
 * Runs 1 iteration to verify:
 *   - Student login
 *   - Company login
 *   - Scans list (GET /api/scans)
 *   - Scan accepted (POST /api/attendant/{uuid}/scan) — requires TEST_ATTENDANT_UUIDS in .env
 *
 * Run:
 *   ./k6/run-smoke-test.sh
 *   ./k6/run-smoke-test.sh -e BASE_URL=http://localhost:3003
 *
 * Or manually (k6 does NOT load .env):
 *   set -a && source .env && set +a && k6 run -e BASE_URL=http://localhost:3003 k6/smoke-test.js
 */

import http from "k6/http";
import { check } from "k6";

import { BASE_URL, TEST_ATTENDANT_UUIDS } from "./config.js";
import { loginAsCompanyRep, loginAsStudent } from "./lib/auth.js";
import { withJar } from "./lib/helpers.js";

export const options = {
  vus: 1,
  iterations: 1,
};

export default function () {
  const jar = http.cookieJar();

  // Student login
  const student = loginAsStudent(jar);
  check(student.ok, { "student login": () => student.ok });

  // Company login
  const company = loginAsCompanyRep(jar);
  check(company.ok, { "company login": () => company.ok });

  if (!company.ok) return;

  // Scans list (company rep must be logged in)
  const scansRes = http.get(`${BASE_URL}/api/scans`, withJar(jar));
  check(scansRes, { "scans list 200": (r) => r.status === 200 });

  // Scan attendant (requires at least one valid attendant UUID in TEST_ATTENDANT_UUIDS)
  const attendantUuid = TEST_ATTENDANT_UUIDS?.[0];
  if (attendantUuid) {
    const scanRes = http.post(
      `${BASE_URL}/api/attendant/${attendantUuid}/scan`,
      null,
      withJar(jar)
    );
    check(scanRes, { "scan accepted": (r) => r.status === 200 });
  }
}
