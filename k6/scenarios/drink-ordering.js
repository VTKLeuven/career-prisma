/**
 * Isolated scenario: Drink ordering via booth QR codes.
 *
 * Simulates the flow where someone at a company booth scans the booth's QR code,
 * sees the drink menu, places an order, and polls for status updates.
 *
 * This is unauthenticated traffic — anyone with the booth QR code can order.
 * The main pressure points are:
 *   - SSR booth page load (fetches booth + drinks + active order from PostgreSQL)
 *   - Status polling (every 5 seconds while order is active)
 *
 * Run:  k6 run k6/scenarios/drink-ordering.js
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";
import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

import { BASE_URL, TEST_BOOTH_IDS } from "../config.js";
import { randomItem } from "../lib/helpers.js";

const boothLoadDuration = new Trend("booth_load_duration", true);
const pollDuration = new Trend("poll_duration", true);
const boothSuccess = new Rate("booth_load_success");
const errors = new Counter("errors");

export const options = {
  scenarios: {
    booth_visitors: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 20 },
        { duration: "2m", target: 80 },
        { duration: "3m", target: 150 },  // peak: lunch rush, everyone wants drinks
        { duration: "2m", target: 150 },
        { duration: "1m", target: 50 },
        { duration: "30s", target: 0 },
      ],
    },
  },
  thresholds: {
    booth_load_duration: ["p(95)<3000"],
    poll_duration: ["p(95)<2000"],
    booth_load_success: ["rate>0.95"],
    http_req_failed: ["rate<0.05"],
  },
};

export default function () {
  const boothId = randomItem(TEST_BOOTH_IDS) || String(randomIntBetween(1, 50));

  // Step 1: Load the booth page (SSR — fetches booth details + drink menu)
  group("Load booth page", () => {
    const res = http.get(`${BASE_URL}/booth/${boothId}`);
    boothLoadDuration.add(res.timings.duration);
    const ok = check(res, { "booth page 200": (r) => r.status === 200 });
    boothSuccess.add(ok ? 1 : 0);
    if (!ok) errors.add(1);
  });

  // User browses the menu, selects drinks
  sleep(randomIntBetween(5, 15));

  // Step 2: After placing order, client polls for status every 5 seconds.
  // Each poll reloads the booth page (SSR) or hits the server action.
  // We simulate 3-8 polls (15-40 seconds of waiting).
  const pollCount = randomIntBetween(3, 8);
  for (let i = 0; i < pollCount; i++) {
    group("Poll order status", () => {
      const res = http.get(`${BASE_URL}/booth/${boothId}`);
      pollDuration.add(res.timings.duration);
      check(res, { "poll 200": (r) => r.status === 200 }) || errors.add(1);
    });
    sleep(5);
  }

  // User finishes, leaves the booth page
  sleep(randomIntBetween(10, 30));
}
