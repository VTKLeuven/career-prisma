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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Queue</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor all outgoing emails and bulk send jobs
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scope</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead>Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.scope}</TableCell>
                    <TableCell><JobStatusBadge status={job.status} /></TableCell>
                    <TableCell className="text-right tabular-nums text-green-600 dark:text-green-400">{job.sent}</TableCell>
                    <TableCell className="text-right tabular-nums text-red-600 dark:text-red-400">{job.failed}</TableCell>
                    <TableCell className="text-right tabular-nums">{job.total}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {job.completedAt ? formatDuration(job.completedAt - job.createdAt) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatTime(job.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Status</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentLog.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell><EmailStatusBadge status={entry.status} /></TableCell>
                      <TableCell className="font-mono text-xs max-w-[200px] truncate">
                        {entry.to}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-sm">
                        {entry.subject}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                        {entry.jobId || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {entry.sentAt
                          ? formatTime(entry.sentAt)
                          : formatTime(entry.queuedAt)}
                        {entry.error && (
                          <span className="block text-red-500 truncate max-w-[200px]" title={entry.error}>
                            {entry.error}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
