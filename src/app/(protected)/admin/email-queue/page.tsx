"use client";

import * as React from "react";
import { useUser } from "@/providers/UserProvider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/DataTable";
import {
  Mail,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  X,
  Activity,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import type { EmailQueueStats, EmailJob, EmailLogEntry } from "@/lib/email-job-manager";
import { PageHeader } from "@/components/admin/PageHeader";

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const remainder = s % 60;
  if (m < 60) return `${m}m ${remainder}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function formatTimeAgo(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

function JobStatusBadge({ status }: { status: EmailJob["status"] }) {
  switch (status) {
    case "processing":
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
    case "queued":
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Queued</Badge>;
    case "completed":
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
    case "failed":
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
    case "cancelled":
      return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"><X className="h-3 w-3 mr-1" />Cancelled</Badge>;
  }
}

function EmailStatusBadge({ status }: { status: EmailLogEntry["status"] }) {
  switch (status) {
    case "queued":
      return <Badge variant="secondary" className="text-xs"><Clock className="h-3 w-3 mr-1" />Queued</Badge>;
    case "sending":
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Sending</Badge>;
    case "sent":
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Sent</Badge>;
    case "failed":
      return <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
  }
}

export default function EmailQueuePage() {
  const { user } = useUser();
  if (!user?.admin) return <p>NO ACCESS</p>;
  return <EmailQueueDashboard />;
}

function EmailQueueDashboard() {
  const [stats, setStats] = React.useState<EmailQueueStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [cancelling, setCancelling] = React.useState<string | null>(null);

  const fetchStats = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/email-queue");
      if (!res.ok) return;
      const data = await res.json();
      setStats(data);
    } catch {
      // Non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const handleCancel = async (jobId: string) => {
    setCancelling(jobId);
    try {
      await fetch("/api/admin/email-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", jobId }),
      });
      await fetchStats();
    } catch {
      // Best-effort
    } finally {
      setCancelling(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Failed to load email queue data.
      </div>
    );
  }

  const activeJobs = stats.jobs.filter(
    (j) => j.status === "queued" || j.status === "processing"
  );
  const recentJobs = stats.jobs.filter(
    (j) => j.status !== "queued" && j.status !== "processing"
  );

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
      <PageHeader
        title="Email Queue"
        description="Monitor all outgoing emails and bulk send jobs"
        actions={
          <Button variant="outline" onClick={fetchStats}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {/* Metrics overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2">
                <Send className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{stats.metrics.totalSent}</p>
                <p className="text-xs text-muted-foreground">Total sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-100 dark:bg-red-900/30 p-2">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{stats.metrics.totalFailed}</p>
                <p className="text-xs text-muted-foreground">Total failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 p-2">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{stats.queueLength}</p>
                <p className="text-xs text-muted-foreground">In SMTP queue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-2">
                <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{stats.metrics.ratePerMinute}</p>
                <p className="text-xs text-muted-foreground">Emails/min</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${stats.metrics.rateLimitErrors > 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-muted"}`}>
                <AlertTriangle className={`h-5 w-5 ${stats.metrics.rateLimitErrors > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{stats.metrics.rateLimitErrors}</p>
                <p className="text-xs text-muted-foreground">Rate limit hits</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active jobs */}
      {activeJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              Active Jobs ({activeJobs.length})
            </CardTitle>
            <CardDescription>
              Bulk email operations currently in progress
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeJobs.map((job) => {
              const processed = job.sent + job.failed + job.skipped;
              const pct = job.total > 0 ? (processed / job.total) * 100 : 0;
              return (
                <div key={job.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{job.scope}</p>
                      <p className="text-xs text-muted-foreground">
                        Started {formatTimeAgo(job.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <JobStatusBadge status={job.status} />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancel(job.id)}
                        disabled={cancelling === job.id}
                      >
                        {cancelling === job.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <><X className="h-3 w-3 mr-1" />Cancel</>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-sm tabular-nums">
                      <span>{processed} / {job.total}</span>
                      <span>{Math.round(pct)}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600 dark:text-green-400">{job.sent} sent</span>
                    <span className="text-red-600 dark:text-red-400">{job.failed} failed</span>
                    <span className="text-muted-foreground">{job.skipped} skipped</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Recent completed jobs */}
      {recentJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Jobs</CardTitle>
            <CardDescription>
              Completed, failed, or cancelled bulk email operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              rows={recentJobs}
              columns={[
                { key: "scope", label: "Scope", filter: true },
                { key: "status", label: "Status", filter: true, render: (job) => <JobStatusBadge status={job.status} /> },
                { key: "sent", label: "Sent", align: "right", className: "text-green-600 dark:text-green-400" },
                { key: "failed", label: "Failed", align: "right", className: "text-red-600 dark:text-red-400" },
                { key: "total", label: "Total", align: "right" },
                {
                  key: "duration",
                  label: "Duration",
                  align: "right",
                  value: (job) => (job.completedAt ? job.completedAt - job.createdAt : null),
                  render: (job) => (job.completedAt ? formatDuration(job.completedAt - job.createdAt) : "—"),
                },
                { key: "createdAt", label: "Started", className: "text-muted-foreground", render: (job) => formatTime(job.createdAt) },
              ]}
              getRowId={(job) => job.id}
              noun="job"
              search={false}
              defaultSort={{ key: "createdAt", desc: true }}
              containerClassName=""
            />
          </CardContent>
        </Card>
      )}

      {/* Email activity log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Recent Email Activity
          </CardTitle>
          <CardDescription>
            All individual emails sent from the platform (last {stats.recentLog.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentLog.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No emails sent yet in this server session.
            </p>
          ) : (
            <DataTable
              rows={stats.recentLog}
              columns={[
                { key: "status", label: "Status", filter: true, render: (entry) => <EmailStatusBadge status={entry.status} /> },
                { key: "to", label: "To", className: "font-mono text-xs max-w-[200px]" },
                { key: "subject", label: "Subject", className: "max-w-[300px] text-sm" },
                { key: "jobId", label: "Job", className: "text-xs text-muted-foreground max-w-[120px]" },
                {
                  key: "time",
                  label: "Time",
                  className: "text-xs text-muted-foreground",
                  value: (entry) => entry.sentAt ?? entry.queuedAt,
                  render: (entry) => (
                    <>
                      {entry.sentAt ? formatTime(entry.sentAt) : formatTime(entry.queuedAt)}
                      {entry.error && (
                        <span className="block text-red-500 truncate max-w-[200px]" title={entry.error}>
                          {entry.error}
                        </span>
                      )}
                    </>
                  ),
                },
              ]}
              getRowId={(entry) => String(entry.id)}
              noun="email"
              defaultSort={{ key: "time", desc: true }}
              containerClassName="max-h-[32rem]"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
