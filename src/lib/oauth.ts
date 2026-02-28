// lib/oauth.ts - OAuth utilities for LITUS authentication

import { cookies } from "next/headers";
import crypto from "crypto";

const OAUTH_STATE_COOKIE = "oauth_state";
const OAUTH_STATE_DURATION = 60 * 10; // 10 minutes

export function generateState(): string {
    return crypto.randomBytes(32).toString("hex");
}

interface StoreStateOptions {
    domain?: string;
    maxAge?: number;
}

export async function storeOAuthState(state: string, redirectTo?: string, options: StoreStateOptions = {}): Promise<void> {
    const cookieStore = await cookies();
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const, // Cast to const to match specific literal type if needed, or rely on inference
        maxAge: options.maxAge || OAUTH_STATE_DURATION,
        path: "/",
        domain: options.domain,
    };

    cookieStore.set(OAUTH_STATE_COOKIE, state, cookieOptions);

    if (redirectTo) {
        cookieStore.set("oauth_redirect_to", redirectTo, cookieOptions);
    }
}

export async function verifyOAuthState(state: string): Promise<boolean> {
    const cookieStore = await cookies();
    const storedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;

    if (!storedState || storedState !== state) {
        return false;
    }

    // Clear the state cookie after verification
    cookieStore.delete(OAUTH_STATE_COOKIE);
    return true;
}

export function getRequestOrigin(request: Request): string {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
}

export function buildAuthorizationUrl(authorizeUrl: string, clientId: string, redirectUri: string, state: string, scopes: string[]): string {
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        state: state,
        scope: scopes.join(" "),
    });

    return `${authorizeUrl}?${params.toString()}`;
}
