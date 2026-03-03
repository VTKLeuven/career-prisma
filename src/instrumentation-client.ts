import * as Sentry from "@sentry/nextjs";

const enableReplay = process.env.NEXT_PUBLIC_SENTRY_ENABLE_REPLAY === "true";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: true,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  integrations: (defaultIntegrations) => {
    // Mitigation for production crashes like: `TypeError: elm.events.push is not a function`
    // These typically originate from browser API instrumentation / replay event capturing.
    const filtered = defaultIntegrations.filter((integration) => {
      // The name strings are how Sentry identifies integrations at runtime.
      if (integration.name === "Replay") return false;
      if (process.env.NODE_ENV === "production" && integration.name === "BrowserApiErrors") {
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
