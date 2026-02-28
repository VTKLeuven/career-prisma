/**
 * Isolated scenario: QR code scanning by company representatives.
 *
 * Simulates the flow where a company rep at their booth scans a student's
 * QR badge. This involves:
 *   1. Company rep login
 *   2. GET /api/attendant/:uuid  (fetch attendant info)
 *   3. GET /api/user/check       (verify auth — the page does this)
 *   4. POST /api/attendant/:uuid/scan  (record the scan)
 *
 * At a jobfair with 50+ company booths, each scanning dozens of students,
 * this can create significant DB write pressure.
 *
 * Run:  k6 run k6/scenarios/qr-scanning.js
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";
import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

import { BASE_URL, TEST_ATTENDANT_UUIDS } from "../config.js";
import { loginAsCompanyRep } from "../lib/auth.js";
import { randomItem, uuidv4, withJar } from "../lib/helpers.js";

const scanRate = new Rate("scan_success");
const scanDuration = new Trend("scan_duration", true);
const errors = new Counter("errors");

export const options = {
  scenarios: {
    scanning_reps: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 },
        { duration: "1m", target: 30 },
        { duration: "3m", target: 50 },
        { duration: "2m", target: 80 },   // peak: all booths scanning at once
        { duration: "2m", target: 80 },
        { duration: "1m", target: 20 },
        { duration: "30s", target: 0 },
      ],
    },
  },
  thresholds: {
    scan_success: ["rate>0.90"],
    scan_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.05"],
    errors: ["count<100"],
  },
};

export default function () {
  const jar = http.cookieJar();

  // Login (once per iteration — simulates a rep who is already logged in)
  group("Login", () => {
    const { ok } = loginAsCompanyRep(jar);
    if (!ok) {
      errors.add(1);
      sleep(5);
      return;
    }
  });

  sleep(1);

  // Each rep scans 3-10 students per iteration
  const numScans = randomIntBetween(3, 10);

  for (let i = 0; i < numScans; i++) {
    const uuid = randomItem(TEST_ATTENDANT_UUIDS) || uuidv4();

    // Step 1: Attendant page loads the attendant data
    group("GET attendant info", () => {
      const res = http.get(`${BASE_URL}/api/attendant/${uuid}`, withJar(jar));
      check(res, {
        "attendant fetched": (r) => r.status === 200 || r.status === 404,
      }) || errors.add(1);
    });

    // Step 2: Page checks if user is authenticated company rep
    group("GET user check", () => {
      const res = http.get(`${BASE_URL}/api/user/check`, withJar(jar));
      check(res, { "user check ok": (r) => r.status === 200 }) || errors.add(1);
    });

    // Step 3: Auto-scan fires
    group("POST scan", () => {
      const res = http.post(`${BASE_URL}/api/attendant/${uuid}/scan`, null, withJar(jar));
      scanDuration.add(res.timings.duration);
      const ok = check(res, { "scan 200": (r) => r.status === 200 });
      scanRate.add(ok ? 1 : 0);
      if (!ok) errors.add(1);
    });

    // Realistic delay between scans: student walks up, shows QR, rep scans
    sleep(randomIntBetween(8, 30));
  }

  sleep(randomIntBetween(5, 15));
}
