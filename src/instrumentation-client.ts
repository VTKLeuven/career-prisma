import * as Sentry from "@sentry/nextjs";

const enableReplay = process.env.NEXT_PUBLIC_SENTRY_ENABLE_REPLAY === "true";
const ignoredErrorPatterns: Array<string | RegExp> = [
  /Error invoking postMessage: Java object is gone/i,
  // Browser extensions (e.g. password managers) injecting scripts can throw this on some browsers.
  /Invalid call to runtime\.sendMessage\(\)\. Tab not found\./i,
  /<get-frame-manager-configuration>/i,
];

function eventHasExtensionOriginStack(event: Sentry.Event): boolean {
  const values = event.exception?.values ?? [];
  for (const v of values) {
    const frames = v.stacktrace?.frames ?? [];
    for (const f of frames) {
      const filename = f.filename ?? f.abs_path ?? "";
      if (/^(chrome|moz|safari-web)-extension:\/\//i.test(filename)) return true;
    }
  }
  return false;
}

function eventContainsIgnoredError(event: Sentry.Event, hint?: Sentry.EventHint): boolean {
  const hintMessage =
    hint?.originalException instanceof Error
      ? hint.originalException.message
      : typeof hint?.originalException === "string"
        ? hint.originalException
        : undefined;

  const topMessage = event.message ?? hintMessage;
  if (topMessage && ignoredErrorPatterns.some((p) => (typeof p === "string" ? topMessage.includes(p) : p.test(topMessage)))) {
    return true;
  }

  const values = event.exception?.values ?? [];
  for (const v of values) {
    const value = v.value ?? "";
    if (ignoredErrorPatterns.some((p) => (typeof p === "string" ? value.includes(p) : p.test(value)))) {
      return true;
    }
  }
  return false;
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: true,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  ignoreErrors: ignoredErrorPatterns,
  beforeSend(event, hint) {
    // Instagram/Android in-app WebViews can throw this when their native bridge is torn down mid-navigation.
    // It's not actionable in our app code, and it can drown out real issues.
    if (eventContainsIgnoredError(event, hint)) return null;
    if (eventHasExtensionOriginStack(event)) return null;
    return event;
  },
  integrations: (defaultIntegrations) => {
    // Mitigation for production crashes like: `TypeError: elm.events.push is not a function`
    // These typically originate from browser API instrumentation / replay event capturing.
    const filtered = defaultIntegrations.filter((integration) => {
      // The name strings are how Sentry identifies integrations at runtime.
      const name = (integration.name ?? "").toLowerCase();
      if (name === "replay" || name.includes("replay")) return false;
      if (process.env.NODE_ENV === "production" && name.includes("browserapierrors")) {
        return false;
      }
      return true;
    });

    if (!enableReplay) return filtered;

    try {
      return [...filtered, Sentry.replayIntegration()];
    } catch {
      return filtered;
    }
  },
  ...(enableReplay
    ? {
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
      }
    : {}),
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
