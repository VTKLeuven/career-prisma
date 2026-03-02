"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

export default function SentryTestPage() {
  const dsnConfigured = !!process.env.NEXT_PUBLIC_SENTRY_DSN;

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-8 bg-vtk-bg">
      <div className="max-w-md w-full rounded-2xl border bg-white p-8 shadow-lg">
        <h1 className="text-xl font-semibold text-neutral-900 mb-2">
          Test Sentry & Global Error Page
        </h1>
        <p className="text-sm text-neutral-600 mb-6">
          Test if Sentry is receiving events. Try the test message first (no
          error), then the error button.
        </p>
        <div
          className={`mb-6 rounded-lg px-3 py-2 text-sm ${
            dsnConfigured
              ? "bg-green-50 text-green-800"
              : "bg-amber-50 text-amber-800"
          }`}
        >
          DSN: {dsnConfigured ? "Configured" : "Not configured"}
        </div>
        <div className="flex flex-col gap-3">
          <Button
            className="w-full"
            onClick={() => {
              Sentry.captureMessage("Manual test from sentry-test page", "info");
            }}
          >
            Send test message to Sentry
          </Button>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => {
              throw new Error("Test error for global-error.tsx");
            }}
          >
            Trigger Error (see global-error page)
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
