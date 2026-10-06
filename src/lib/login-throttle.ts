import "server-only";

/**
 * Failed sign-ins, counted per account and per client IP over a sliding
 * window. Past the limit, sign-in answers 429 until the oldest failure ages
 * out: a password can no longer be guessed at full speed, and every guess
 * costs the server an argon2 hash.
 *
 * Kept in this process, like the page caches (one container; it resets on
 * deploy) and on globalThis so every route bundle shares it.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_ACCOUNT = 10;
// Higher: a campus or event network puts many people behind one address.
const MAX_PER_IP = 50;

type Kind = "user" | "student";

const store = globalThis as { __loginFailures?: Map<string, number[]> };
const failures = (store.__loginFailures ??= new Map<string, number[]>());

function recent(key: string, now: number): number[] {
  const list = (failures.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  if (list.length) failures.set(key, list);
  else failures.delete(key);
  return list;
}

function accountKey(kind: Kind, email: string) {
  return `${kind}:account:${email.trim().toLowerCase()}`;
}

function ipKey(kind: Kind, ip: string) {
  return `${kind}:ip:${ip}`;
}

/**
 * The client's address as the proxy in front reports it, or null. Without
 * one, every visitor would share a single counter and lock each other out, so
 * only the per-account limit applies then.
 */
export function clientIp(request: Request): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    null
  );
}

/** Seconds until another attempt is allowed; 0 when it is allowed now. */
export function loginRetryAfter(kind: Kind, email: string, ip: string | null): number {
  const now = Date.now();
  const over: Array<readonly [number[], number]> = [[recent(accountKey(kind, email), now), MAX_PER_ACCOUNT]];
  if (ip) over.push([recent(ipKey(kind, ip), now), MAX_PER_IP]);
  let waitUntil = 0;
  for (const [list, max] of over) {
    // Allowed again once the failures inside the window drop below the limit.
    if (list.length >= max) waitUntil = Math.max(waitUntil, list[list.length - max] + WINDOW_MS);
  }
  return waitUntil ? Math.ceil((waitUntil - now) / 1000) : 0;
}

export function recordLoginFailure(kind: Kind, email: string, ip: string | null) {
  const now = Date.now();
  for (const key of ip ? [accountKey(kind, email), ipKey(kind, ip)] : [accountKey(kind, email)]) {
    failures.set(key, [...recent(key, now), now]);
  }
  // Addresses that are never tried again would otherwise stay forever.
  if (failures.size > 10_000) {
    for (const key of [...failures.keys()]) recent(key, now);
  }
}

/** A successful sign-in clears the account's count (not the IP's). */
export function clearLoginFailures(kind: Kind, email: string) {
  failures.delete(accountKey(kind, email));
}

export function tooManyAttemptsMessage(retryAfterSeconds: number) {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Too many sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

const RESETS_PER_HOUR = 3;

/**
 * Whether another password-reset email may go to this address now -- three
 * an hour -- counting this one. The reset endpoints answer the same either
 * way; this only stops them being used to flood someone's inbox.
 */
export function allowResetEmail(email: string): boolean {
  const now = Date.now();
  const key = `reset:${email.trim().toLowerCase()}`;
  const sent = (failures.get(key) ?? []).filter((at) => now - at < 60 * 60 * 1000);
  if (sent.length >= RESETS_PER_HOUR) {
    failures.set(key, sent);
    return false;
  }
  failures.set(key, [...sent, now]);
  return true;
}
