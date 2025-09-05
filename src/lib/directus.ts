// lib/directus.ts
import {
  createDirectus,
  rest,
  staticToken,
} from "@directus/sdk";
import { cookies } from "next/headers";

const DIRECTUS_URL = process.env.DIRECTUS_URL!;

/**
 * Base client (no auth).
 * Good for public collections or items that don't need user context.
 */
export const fullDirectus = createDirectus(DIRECTUS_URL);
export const directus = fullDirectus.with(rest());

/**
 * Factory: creates an authenticated client from a token
 */
export async function getFullDirectusWithToken() {
  const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? 'directus'}_access`;

  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  return createDirectus(DIRECTUS_URL).with(staticToken(token));
}
export async function getDirectusWithToken() {
  const ACCESS_COOKIE = `${process.env.AUTH_COOKIE_PREFIX ?? "directus"}_access`;

  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  return createDirectus(DIRECTUS_URL).with(staticToken(token)).with(rest());
}

export async function getAuthedDirectusOrThrow() {
  const client = await getDirectusWithToken();
  if (!client) {
    throw new Error("Forbidden"); // or make this a custom error
  }
  return client;
}