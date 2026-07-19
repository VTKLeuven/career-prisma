/**
 * Soak test: sustained moderate load over a long period.
 *
 * Validates that the system doesn't degrade over time (memory leaks,
 * connection pool exhaustion, session failures, cache growth, etc.).
 * Runs at a lower VU count but for much longer.
 *
 * Run:  k6 run k6/scenarios/soak-test.js
 * (Expect ~30 minute run time)
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Trend, Counter, Rate } from "k6/metrics";
import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

import {
  BASE_URL,
  TEST_EVENT_SLUG,
  TEST_BOOTH_IDS,
  TEST_ATTENDANT_UUIDS,
} from "../config.js";
import { loginAsCompanyRep } from "../lib/auth.js";
import { randomItem, uuidv4, withJar } from "../lib/helpers.js";

const responseDuration = new Trend("response_duration", true);
const successRate = new Rate("success_rate");
const errors = new Counter("errors");

export const options = {
  scenarios: {
    soak: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 200 },    // ramp up
        { duration: "25m", target: 200 },   // sustained load (the entire fair duration, compressed)
        { duration: "2m", target: 0 },      // ramp down
      ],
    },
  },
  thresholds: {
    response_duration: ["p(95)<3000", "p(99)<6000"],
    success_rate: ["rate>0.95"],
    http_req_failed: ["rate<0.03"],
  },
};

export default function () {
  const scenario = randomIntBetween(1, 10);

  if (scenario <= 5) {
    // 50%: public browsing
    const pages = [
      `${BASE_URL}/`,
      `${BASE_URL}/api/homepage`,
      `${BASE_URL}/api/events/${TEST_EVENT_SLUG || "vtk-jobfair"}`,
      `${BASE_URL}/vacancies`,
      `${BASE_URL}/contact`,
    ];
    const res = http.get(randomItem(pages));
    responseDuration.add(res.timings.duration);
    const ok = check(res, { "ok": (r) => r.status === 200 || r.status === 404 });
    successRate.add(ok ? 1 : 0);
    if (!ok) errors.add(1);

  } else if (scenario <= 7) {
    // 20%: QR scanning
    const jar = http.cookieJar();
    loginAsCompanyRep(jar);
    const uuid = randomItem(TEST_ATTENDANT_UUIDS) || uuidv4();

    const res1 = http.get(`${BASE_URL}/api/attendant/${uuid}`, withJar(jar));
    responseDuration.add(res1.timings.duration);
    check(res1, { "attendant ok": (r) => r.status === 200 || r.status === 404 }) || errors.add(1);

    const res2 = http.post(`${BASE_URL}/api/attendant/${uuid}/scan`, null, withJar(jar));
    responseDuration.add(res2.timings.duration);
    const ok = check(res2, { "scan ok": (r) => r.status === 200 });
    successRate.add(ok ? 1 : 0);
    if (!ok) errors.add(1);

  } else if (scenario <= 9) {
    // 20%: booth / drink ordering
    const boothId = randomItem(TEST_BOOTH_IDS) || String(randomIntBetween(1, 50));
    const res = http.get(`${BASE_URL}/booth/${boothId}`);
    responseDuration.add(res.timings.duration);
    const ok = check(res, { "booth ok": (r) => r.status === 200 });
    successRate.add(ok ? 1 : 0);
    if (!ok) errors.add(1);

  } else {
    // 10%: auth check polling
    const res = http.get(`${BASE_URL}/api/user/check`);
    responseDuration.add(res.timings.duration);
    const ok = check(res, { "user check ok": (r) => r.status === 200 });
    successRate.add(ok ? 1 : 0);
    if (!ok) errors.add(1);
  }

  sleep(randomIntBetween(3, 10));
}
