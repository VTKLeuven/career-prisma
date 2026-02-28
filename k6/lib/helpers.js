import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

/**
 * Pick a random element from an array. Returns undefined if the array is empty.
 */
export function randomItem(arr) {
  if (!arr || arr.length === 0) return undefined;
  return arr[randomIntBetween(0, arr.length - 1)];
}

/**
 * Generate a UUID v4 (useful for simulating unknown attendant UUIDs).
 */
export function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Standard JSON headers.
 */
export const jsonHeaders = { "Content-Type": "application/json" };

/**
 * Default request params with a cookie jar.
 */
export function withJar(jar, extra) {
  return Object.assign({ jar }, extra || {});
}
