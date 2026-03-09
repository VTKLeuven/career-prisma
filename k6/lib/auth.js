import http from "k6/http";
import { check } from "k6";
import { BASE_URL, AUTH_COOKIE_PREFIX, COMPANY_REP_EMAIL, COMPANY_REP_PASSWORD, STUDENT_EMAIL, STUDENT_PASSWORD } from "../config.js";

/**
 * Log in as a company representative and return the cookie jar.
 * k6 automatically attaches cookies from the jar on subsequent requests
 * when using the same VU (virtual user).
 */
export function loginAsCompanyRep(jar, email, password) {
  const res = http.post(
    `${BASE_URL}/api/login`,
    JSON.stringify({
      email: email || COMPANY_REP_EMAIL,
      password: password || COMPANY_REP_PASSWORD,
      rememberMe: false,
    }),
    {
      headers: { "Content-Type": "application/json" },
      jar,
      responseType: "text", // needed when discardResponseBodies is true
    }
  );

  const ok = check(res, {
    "company login status 200": (r) => r.status === 200,
    "company login has message": (r) => {
      try { return JSON.parse(r.body).message === "Successful login"; } catch { return false; }
    },
  });

  return { ok, response: res, jar };
}

/**
 * Log in as a student and return the cookie jar.
 */
export function loginAsStudent(jar, email, password) {
  const res = http.post(
    `${BASE_URL}/api/students/login`,
    JSON.stringify({
      email: email || STUDENT_EMAIL,
      password: password || STUDENT_PASSWORD,
      rememberMe: false,
    }),
    {
      headers: { "Content-Type": "application/json" },
      jar,
      responseType: "text", // needed when discardResponseBodies is true
    }
  );

  const ok = check(res, {
    "student login status 200": (r) => r.status === 200,
    "student login success": (r) => {
      try { return JSON.parse(r.body).success === true; } catch { return false; }
    },
  });

  return { ok, response: res, jar };
}

/**
 * Extract the access token cookie value from a jar (useful for Authorization headers).
 */
export function getAccessToken(jar) {
  const cookies = jar.cookiesForURL(BASE_URL);
  const cookieName = `${AUTH_COOKIE_PREFIX}_access`;
  return cookies[cookieName] ? cookies[cookieName][0] : null;
}
