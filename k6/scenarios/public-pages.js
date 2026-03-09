/**
 * Isolated scenario: Public page browsing under heavy load.
 *
 * Tests the pages that ALL 2000+ jobfair visitors will hit simultaneously:
 * homepage, event pages, floorplan, company pages, vacancies.
 *
 * Run:  k6 run k6/scenarios/public-pages.js
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";
import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

import { BASE_URL, TEST_EVENT_SLUG, DEFAULT_THRESHOLDS } from "../config.js";
import { randomItem } from "../lib/helpers.js";

const pageDuration = new Trend("page_duration", true);
const apiDuration = new Trend("api_duration", true);
const errors = new Counter("errors");

export const options = {
  scenarios: {
    sustained_load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 100 },
        { duration: "2m", target: 500 },
        { duration: "3m", target: 1000 },
        { duration: "2m", target: 1000 },
        { duration: "1m", target: 0 },
      ],
    },
  },
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    page_duration: ["p(95)<3000", "p(99)<6000"],
    api_duration: ["p(95)<1000", "p(99)<3000"],
  },
};

const PUBLIC_PATHS = [
  "/",
  "/vacancies",
  "/contact",
  "/our-students",
  "/terms",
];

export default function () {
  // 1) Homepage (most common entry point)
  group("Homepage SSR", () => {
    const res = http.get(`${BASE_URL}/`);
    pageDuration.add(res.timings.duration);
    check(res, { "homepage 200": (r) => r.status === 200 }) || errors.add(1);
  });

  sleep(randomIntBetween(1, 3));

  // 2) Homepage API (client-side hydration fetch)
  group("Homepage API", () => {
    const res = http.get(`${BASE_URL}/api/homepage`);
    apiDuration.add(res.timings.duration);
    check(res, { "homepage api 200": (r) => r.status === 200 }) || errors.add(1);
  });

  sleep(randomIntBetween(1, 4));

  // 3) Event page (the main jobfair event page — heavily cached)
  group("Event page API", () => {
    const slug = TEST_EVENT_SLUG || "vtk-jobfair";
    const res = http.get(`${BASE_URL}/api/events/${slug}`);
    apiDuration.add(res.timings.duration);
    check(res, { "event api ok": (r) => r.status === 200 || r.status === 404 }) || errors.add(1);
  });

  sleep(randomIntBetween(2, 6));

  // 4) Event SSR page
  group("Event SSR page", () => {
    const slug = TEST_EVENT_SLUG || "vtk-jobfair";
    const res = http.get(`${BASE_URL}/event/${slug}`);
    pageDuration.add(res.timings.duration);
    check(res, { "event page ok": (r) => r.status === 200 || r.status === 404 }) || errors.add(1);
  });

  sleep(randomIntBetween(3, 8));

  // 5) Random additional public page
  const path = randomItem(PUBLIC_PATHS);
  group("Random public page", () => {
    const res = http.get(`${BASE_URL}${path}`);
    pageDuration.add(res.timings.duration);
    check(res, { "public page ok": (r) => r.status === 200 }) || errors.add(1);
  });

  // Simulate realistic reading / browsing time
  sleep(randomIntBetween(5, 20));
}
