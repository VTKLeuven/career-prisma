// ── Job types ──

export type EmailTaskResult = "sent" | "skipped" | "failed";
export type EmailTask = () => Promise<EmailTaskResult>;

export interface EmailJob {
  id: string;
  scope: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  errors: string[];
  createdAt: number;
  completedAt?: number;
}

interface InternalJob extends EmailJob {
  tasks: EmailTask[];
  cancelled: boolean;
}

interface JobOptions {
  batchSize?: number;
  batchCooldownMs?: number;
}

// ── Email log types ──

export interface EmailLogEntry {
  id: number;
  to: string;
  subject: string;
  from: string;
  status: "queued" | "sending" | "sent" | "failed";
  error?: string;
  queuedAt: number;
  sentAt?: number;
  /** Which job spawned this email, if any */
  jobId?: string;
}

export interface EmailQueueStats {
  queueLength: number;
  activeJobs: number;
  recentLog: EmailLogEntry[];
  jobs: EmailJob[];
  metrics: {
    totalSent: number;
    totalFailed: number;
    ratePerMinute: number;
    ratePerHour: number;
    rateLimitErrors: number;
  };
}

// ── Constants ──

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_BATCH_COOLDOWN_MS = 5000;
const JOB_CLEANUP_AFTER_MS = 60 * 60 * 1000; // 1 hour
const MAX_LOG_ENTRIES = 500;

// ── Manager ──

class EmailJobManager {
  private jobs = new Map<string, InternalJob>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  // Global email activity log (ring buffer)
  private emailLog: EmailLogEntry[] = [];
  private nextLogId = 1;
  private totalFailed = 0;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanupOldJobs(), 5 * 60 * 1000);
  }

  // ── Job management ──

  startJob(
    id: string,
    scope: string,
    tasks: EmailTask[],
    options?: JobOptions
  ): EmailJob {
    const activeForScope = Array.from(this.jobs.values()).find(
      (j) => j.scope === scope && (j.status === "queued" || j.status === "processing")
    );
    if (activeForScope) {
      throw new Error(
        `A job is already running for scope "${scope}" (job ${activeForScope.id}, status: ${activeForScope.status})`
      );
    }

    const job: InternalJob = {
      id,
      scope,
      status: "queued",
      total: tasks.length,
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      createdAt: Date.now(),
      tasks,
      cancelled: false,
    };

    this.jobs.set(id, job);

    const batchSize = options?.batchSize ?? DEFAULT_BATCH_SIZE;
    const cooldown = options?.batchCooldownMs ?? DEFAULT_BATCH_COOLDOWN_MS;
    this.processJob(job, batchSize, cooldown).catch((err) => {
      console.error(`[EmailJobManager] Unexpected error in job ${id}:`, err);
      job.status = "failed";
      job.completedAt = Date.now();
    });

    return this.toPublicJob(job);
  }

  cancelJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;
    if (job.status !== "queued" && job.status !== "processing") return false;
    job.cancelled = true;
    return true;
  }

  getJob(id: string): EmailJob | undefined {
    const job = this.jobs.get(id);
    return job ? this.toPublicJob(job) : undefined;
  }

  getActiveJobs(): EmailJob[] {
    return Array.from(this.jobs.values())
      .filter((j) => j.status === "queued" || j.status === "processing")
      .map((j) => this.toPublicJob(j));
  }

  getAllJobs(): EmailJob[] {
    return Array.from(this.jobs.values())
      .map((j) => this.toPublicJob(j))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  getJobsForScope(scope: string): EmailJob[] {
    return Array.from(this.jobs.values())
      .filter((j) => j.scope === scope)
      .map((j) => this.toPublicJob(j));
  }

  // ── Global email log ──

  /**
   * Record an email entering the SMTP queue. Returns the log entry ID
   * so the caller can update its status once it's sent or fails.
   */
  logEmailQueued(to: string, subject: string, from: string, jobId?: string): number {
    const id = this.nextLogId++;
    const entry: EmailLogEntry = {
      id,
      to,
      subject,
      from,
      status: "queued",
      queuedAt: Date.now(),
      jobId,
    };
    this.emailLog.push(entry);
    if (this.emailLog.length > MAX_LOG_ENTRIES) {
      this.emailLog.shift();
    }
    return id;
  }

  logEmailSending(logId: number) {
    const entry = this.emailLog.find((e) => e.id === logId);
    if (entry) entry.status = "sending";
  }

  logEmailSent(logId: number) {
    const entry = this.emailLog.find((e) => e.id === logId);
    if (entry) {
      entry.status = "sent";
      entry.sentAt = Date.now();
    }
  }

  logEmailFailed(logId: number, error: string) {
    const entry = this.emailLog.find((e) => e.id === logId);
    if (entry) {
      entry.status = "failed";
      entry.error = error;
      entry.sentAt = Date.now();
    }
    this.totalFailed++;
  }

  getRecentLog(limit = 100): EmailLogEntry[] {
    return this.emailLog.slice(-limit).reverse();
  }

  /**
   * Aggregate stats for the admin dashboard.
   * Pass in live metrics from the SMTP queue layer.
   */
  getStats(smtpMetrics: {
    queueLength: number;
    totalSent: number;
    ratePerMinute: number;
    ratePerHour: number;
    rateLimitErrors: number;
  }): EmailQueueStats {
    return {
      queueLength: smtpMetrics.queueLength,
      activeJobs: this.getActiveJobs().length,
      recentLog: this.getRecentLog(100),
      jobs: this.getAllJobs(),
      metrics: {
        totalSent: smtpMetrics.totalSent,
        totalFailed: this.totalFailed,
        ratePerMinute: smtpMetrics.ratePerMinute,
        ratePerHour: smtpMetrics.ratePerHour,
        rateLimitErrors: smtpMetrics.rateLimitErrors,
      },
    };
  }

  // ── Internals ──

  private async processJob(
    job: InternalJob,
    batchSize: number,
    cooldownMs: number
  ) {
    job.status = "processing";
    const { tasks } = job;

    for (let i = 0; i < tasks.length; i += batchSize) {
      if (job.cancelled) {
        job.status = "cancelled";
        job.completedAt = Date.now();
        if (process.env.NODE_ENV === "development") {
          console.log(
            `[EmailJobManager] Job ${job.id} cancelled at ${job.sent + job.failed + job.skipped}/${job.total}`
          );
        }
        return;
      }

      const batch = tasks.slice(i, i + batchSize);
      for (const task of batch) {
        if (job.cancelled) {
          job.status = "cancelled";
          job.completedAt = Date.now();
          return;
        }

        try {
          const result = await task();
          switch (result) {
            case "sent":
              job.sent++;
              break;
            case "skipped":
              job.skipped++;
              break;
            case "failed":
              job.failed++;
              break;
          }
        } catch (err) {
          job.failed++;
          const msg = err instanceof Error ? err.message : "Unknown error";
          if (job.errors.length < 100) {
            job.errors.push(msg);
          }
        }
      }

      const hasMore = i + batchSize < tasks.length;
      if (hasMore && !job.cancelled) {
        if (process.env.NODE_ENV === "development") {
          console.log(
            `[EmailJobManager] Job ${job.id}: batch done (${job.sent + job.failed + job.skipped}/${job.total}), cooling down ${cooldownMs}ms`
          );
        }
        await new Promise((resolve) => setTimeout(resolve, cooldownMs));
      }
    }

    job.status = job.failed > 0 && job.sent === 0 ? "failed" : "completed";
    job.completedAt = Date.now();
    if (process.env.NODE_ENV === "development") {
      const duration = Math.round((job.completedAt - job.createdAt) / 1000);
      console.log(
        `[EmailJobManager] Job ${job.id} ${job.status}: ${job.sent} sent, ${job.failed} failed, ${job.skipped} skipped (${duration}s)`
      );
    }
  }

  private cleanupOldJobs() {
    const now = Date.now();
    for (const [id, job] of this.jobs) {
      if (job.completedAt && now - job.completedAt > JOB_CLEANUP_AFTER_MS) {
        this.jobs.delete(id);
      }
    }
  }

  private toPublicJob(job: InternalJob): EmailJob {
    return {
      id: job.id,
      scope: job.scope,
      status: job.status,
      total: job.total,
      sent: job.sent,
      failed: job.failed,
      skipped: job.skipped,
      errors: job.errors,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }
}

// Singleton - survives across requests within the same Next.js process
const globalForJobs = globalThis as unknown as {
  emailJobManager?: EmailJobManager;
};

if (!globalForJobs.emailJobManager) {
  globalForJobs.emailJobManager = new EmailJobManager();
}

export const emailJobManager = globalForJobs.emailJobManager;
