/**
 * BOTTLENECK DIAGNOSTIC — Run these tests to find where the 950 VU limit comes from.
 *
 * Run each test separately. Compare which one fails first.
 *
 * Test 1 (no app logic): k6 run -e BASE_URL=http://liv:3002 -e DIAG=health k6/diagnose-bottleneck.js
 * Test 2 (Next.js only): k6 run -e BASE_URL=http://liv:3002 -e DIAG=nextjs k6/diagnose-bottleneck.js
 * Test 3 (Directus):    k6 run -e BASE_URL=http://liv:3002 -e DIAG=directus k6/diagnose-bottleneck.js
 *
 * If health fails at 950 → Caddy/Docker/network
 * If nextjs fails, health OK → Next.js or Caddy→Next.js
 * If directus fails, nextjs OK → Directus
 */

import http from "k6/http";
import { check } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3002";
const DIAG = __ENV.DIAG || "health";

export const options = {
  scenarios: {
    load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 500 },
        { duration: "2m", target: 1000 },
        { duration: "2m", target: 1200 },
        { duration: "2m", target: 1500 },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
  },
};

function getHealth() {
  return http.get(`${BASE_URL}/api/health`);
}

function getNextJsHomepage() {
  return http.get(`${BASE_URL}/`);
}

function getDirectus() {
  // Adjust if your Directus is elsewhere — this hits the Next.js API that calls Directus
  return http.get(`${BASE_URL}/api/homepage`);
}

export default function () {
  let res;
  if (DIAG === "health") {
    res = getHealth();
  } else if (DIAG === "nextjs") {
    res = getNextJsHomepage();
  } else if (DIAG === "directus") {
    res = getDirectus();
  } else {
    res = getHealth();
  }

  check(res, { "status 200": (r) => r.status === 200 });
}
