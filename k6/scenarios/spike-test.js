/**
 * Spike test: simulates a sudden surge of traffic.
 *
 * This models the "doors open" moment at the jobfair when everyone arrives
 * at once and pulls up the website on their phone.
 *
 * Run:  k6 run k6/scenarios/spike-test.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter, Rate } from "k6/metrics";
import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

import { BASE_URL, TEST_EVENT_SLUG, DEFAULT_THRESHOLDS } from "../config.js";
import { randomItem } from "../lib/helpers.js";

const responseDuration = new Trend("response_duration", true);
const successRate = new Rate("success_rate");
const errors = new Counter("errors");

export const options = {
  scenarios: {
    spike: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 50 },     // baseline
        { duration: "10s", target: 50 },     // hold baseline
        { duration: "20s", target: 1500 },   // SPIKE: doors open
        { duration: "1m", target: 1500 },    // hold at spike
        { duration: "30s", target: 2000 },   // peak surge
        { duration: "30s", target: 2000 },   // hold peak
        { duration: "1m", target: 500 },     // people settle in
        { duration: "30s", target: 0 },      // event moves to in-person
      ],
    },
  },
  thresholds: {
    response_duration: ["p(95)<5000", "p(99)<10000"],
    success_rate: ["rate>0.80"],
    http_req_failed: ["rate<0.15"],
  },
};

const PAGES = [
  "/",
  "/api/homepage",
  `/event/${TEST_EVENT_SLUG || "jobfair-2026"}`,
  `/api/events/${TEST_EVENT_SLUG || "jobfair-2026"}`,
  "/vacancies",
  "/contact",
  "/our-students",
];

export default function () {
  const url = `${BASE_URL}${randomItem(PAGES)}`;
  const res = http.get(url);
  responseDuration.add(res.timings.duration);
  const ok = check(res, {
    "status ok": (r) => r.status === 200 || r.status === 304 || r.status === 404,
  });
  successRate.add(ok ? 1 : 0);
  if (!ok) errors.add(1);

  sleep(randomIntBetween(1, 5));
}
