/**
 * BOTTLENECK DIAGNOSTIC — Run these tests to find where the 950 VU limit comes from.
 *
 * Run each test separately. Compare which one fails first.
 *
 * Test 1 (no app logic): k6 run -e BASE_URL=http://liv:3003 -e DIAG=health k6/diagnose-bottleneck.js
 * Test 2 (Next.js only): k6 run -e BASE_URL=http://liv:3003 -e DIAG=nextjs k6/diagnose-bottleneck.js
 * Test 3 (database):    k6 run -e BASE_URL=http://liv:3003 -e DIAG=database k6/diagnose-bottleneck.js
 *
 * If health fails at 950 → Docker/network
 * If nextjs fails, health OK → Next.js
 * If database fails, nextjs OK → PostgreSQL/query layer
 */

import http from "k6/http";
import { check } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3003";
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

function getDatabaseBackedPage() {
  return http.get(`${BASE_URL}/api/homepage`);
}

export default function () {
  let res;
  if (DIAG === "health") {
    res = getHealth();
  } else if (DIAG === "nextjs") {
    res = getNextJsHomepage();
  } else if (DIAG === "database") {
    res = getDatabaseBackedPage();
  } else {
    res = getHealth();
  }

  check(res, { "status 200": (r) => r.status === 200 });
}
