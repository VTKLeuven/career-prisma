/**
 * Quick failure check — ~1.5 min run to see which requests fail.
 *
 * Run via script (loads .env for login credentials):
 *   ./k6/run-quick-failure-check.sh -e BASE_URL=http://localhost:3002
 *
 * Failures logged to stderr. Redirect to analyze:
 *   ./k6/run-quick-failure-check.sh -e BASE_URL=http://localhost:3002 2>failures.log
 *   grep "FAILED" failures.log | sed 's/.*FAILED: //' | sort | uniq -c | sort -rn
 */

import http from "k6/http";

// Patch http.get/post to log failures (must run before stress-test imports http)
const origGet = http.get;
const origPost = http.post;
const logFailure = (method, res) => {
  if (res && (res.status < 200 || res.status >= 300)) {
    const url = res.url || res.request?.url || "?";
    console.warn(`FAILED: ${res.status} ${method} ${url}`);
  }
};
http.get = (url, params) => {
  const res = origGet.call(http, url, params);
  logFailure("GET", res);
  return res;
};
http.post = (url, body, params) => {
  const res = origPost.call(http, url, body, params);
  logFailure("POST", res);
  return res;
};

import {
  publicBrowsing,
  drinkOrdering,
  studentAuthFlow,
  companyAuthFlow,
} from "./stress-test.js";

export { publicBrowsing, drinkOrdering, studentAuthFlow, companyAuthFlow };

export const options = {
  discardResponseBodies: true,
  scenarios: {
    public_browsers: {
      executor: "ramping-vus",
      exec: "publicBrowsing",
      startVUs: 0,
      stages: [
        { duration: "15s", target: 20 },
        { duration: "45s", target: 30 },
        { duration: "15s", target: 0 },
      ],
      gracefulRampDown: "5s",
    },
    drink_orderers: {
      executor: "ramping-vus",
      exec: "drinkOrdering",
      startVUs: 0,
      stages: [
        { duration: "15s", target: 5 },
        { duration: "45s", target: 10 },
        { duration: "15s", target: 0 },
      ],
      gracefulRampDown: "5s",
    },
    student_auth: {
      executor: "ramping-vus",
      exec: "studentAuthFlow",
      startVUs: 0,
      stages: [
        { duration: "15s", target: 5 },
        { duration: "45s", target: 10 },
        { duration: "15s", target: 0 },
      ],
      gracefulRampDown: "5s",
    },
    company_auth: {
      executor: "ramping-vus",
      exec: "companyAuthFlow",
      startVUs: 0,
      stages: [
        { duration: "15s", target: 5 },
        { duration: "45s", target: 10 },
        { duration: "15s", target: 0 },
      ],
      gracefulRampDown: "5s",
    },
  },
  // No thresholds — we just want to see failures, not fail the run
  thresholds: {},
};
