import Link from "next/link";
import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { getUserFromCookies } from "@/lib/auth-server";
import { isDevEnvironment } from "@/lib/dev-environment";
import {
  STUDENT_SESSION_MAX_AGE,
  discover,
  getCallbackUrl,
  getSsoConfig,
  type SsoEndpoints,
} from "@/lib/vtk-sso";
import {
  latestAppliedMigration,
  summarizeSystemLogs,
} from "@/lib/repos/system-logs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import packageJson from "../../../../../package.json";
import { PageHeader } from "@/components/admin/PageHeader";

export const dynamic = "force-dynamic";

type Health = "ok" | "warn" | "error";

function HealthIcon({ health }: { health: Health }) {
  if (health === "ok") return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  if (health === "warn") return <AlertTriangle className="h-5 w-5 text-amber-600" />;
  return <XCircle className="h-5 w-5 text-red-600" />;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[12rem_1fr] gap-4 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-all font-mono text-xs leading-5">{children}</dd>
    </div>
  );
}

function formatDate(date: Date | null | undefined): string {
  return date
    ? date.toLocaleString("en-GB", { timeZone: "Europe/Brussels" })
    : "never";
}

/** Discovery with a deadline, so a hanging SSO cannot hang this page. */
async function checkDiscovery(
  issuer: string
): Promise<{ endpoints: SsoEndpoints } | { error: string }> {
  try {
    const endpoints = await Promise.race([
      discover(issuer),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("No answer within 5 seconds")), 5000)
      ),
    ]);
    return { endpoints };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export default async function SystemStatusPage() {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;

  // The same derivation the login routes use, fed this request's headers, so
  // the page shows the redirect URI the SSO will actually be sent.
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost";
  const proto = requestHeaders.get("x-forwarded-proto") ?? "http";
  const callbackUrl = getCallbackUrl(
    new NextRequest(`${proto}://${host}/admin/system-status`, { headers: requestHeaders })
  );

  const config = getSsoConfig();
  const configured = !("error" in config);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [discovery, ssoLogs, migration] = await Promise.all([
    configured ? checkDiscovery(config.issuer) : null,
    summarizeSystemLogs("vtk_sso", since),
    latestAppliedMigration().catch(() => null),
  ]);

  const ssoHealth: Health = !configured || (discovery && "error" in discovery)
    ? "error"
    : ssoLogs.counts.error > 0
      ? "warn"
      : "ok";

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="System Status" description="How this deployment is configured and whether the VTK login is healthy. Secrets are never shown — only whether they are set." />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HealthIcon health={ssoHealth} />
            <CardTitle>VTK login (SSO)</CardTitle>
          </div>
          <CardDescription>
            Student sign-in through the vtk.be SSO. See{" "}
            <Link href="/admin/system-logs?source=vtk_sso" className="underline">
              the VTK login logs
            </Link>{" "}
            for individual attempts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl>
            {"error" in config ? (
              <Row label="Configuration">
                <span className="text-red-600">{config.error}</span>
              </Row>
            ) : (
              <>
                <Row label="Issuer">{config.issuer}</Row>
                <Row label="Client ID">{config.clientId}</Row>
                <Row label="Client secret">set</Row>
                <Row label="Scopes">{config.scopes.join(" ")}</Row>
              </>
            )}
            <Row label="Redirect URI">
              {callbackUrl}
              {!process.env.VTK_SSO_CALLBACK_URL && (
                <span className="text-muted-foreground"> (derived — must match the one registered at the SSO)</span>
              )}
            </Row>
            {discovery && (
              <Row label="Discovery">
                {"error" in discovery ? (
                  <span className="text-red-600">{discovery.error}</span>
                ) : (
                  <span className="text-green-700 dark:text-green-400">
                    reachable — issuer {discovery.endpoints.issuer}
                  </span>
                )}
              </Row>
            )}
            <Row label="Last 24 hours">
              {ssoLogs.counts.info} info · {ssoLogs.counts.warn} warnings ·{" "}
              <span className={ssoLogs.counts.error ? "text-red-600" : undefined}>
                {ssoLogs.counts.error} errors
              </span>
            </Row>
            <Row label="Last successful login">
              {formatDate(ssoLogs.lastByEvent.login_succeeded)}
            </Row>
            <Row label="Last failed login">
              {formatDate(ssoLogs.lastByEvent.login_failed)}
            </Row>
            <Row label="Student session length">
              {STUDENT_SESSION_MAX_AGE / 3600} hours
            </Row>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HealthIcon health={migration ? "ok" : "warn"} />
            <CardTitle>Deployment</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <dl>
            <Row label="Environment">
              {isDevEnvironment() ? "dev (DEV_ENVIRONMENT=true)" : "production"}
            </Row>
            <Row label="NODE_ENV">{process.env.NODE_ENV}</Row>
            <Row label="App version">{packageJson.version}</Row>
            <Row label="Node.js">{process.version}</Row>
            <Row label="Latest migration">
              {migration
                ? `${migration.name} (applied ${formatDate(migration.finishedAt)})`
                : "could not read _prisma_migrations"}
            </Row>
            <Row label="Mail (SMTP)">
              {process.env.SMTP_HOST ? `host ${process.env.SMTP_HOST}` : "not configured"}
            </Row>
            <Row label="Sentry">
              {process.env.NEXT_PUBLIC_SENTRY_DSN ? "enabled" : "not configured"}
            </Row>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
