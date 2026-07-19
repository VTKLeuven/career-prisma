// Shared server-side email transport.
"use server";

import nodemailer from "nodemailer";

// Singleton transporter with connection pooling to avoid rate limiting
let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  // Check if SMTP credentials are provided for Google SMTP
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const isDevelopment = process.env.NODE_ENV === "development";
  const explicitSmtpHost = process.env.SMTP_HOST?.trim();
  
  // Determine SMTP host with priority:
  // 1. Use SMTP_HOST if explicitly configured (highest priority)
  //    This allows Google Workspace relay (smtp-relay.gmail.com) to work even with credentials
  // 2. If SMTP_USER and SMTP_PASS are provided but no SMTP_HOST, use smtp.gmail.com
  // 3. Finally, default to smtp-relay.gmail.com (requires IP allowlisting, no auth)
  let smtpHost: string;
  const hasCredentials = smtpUser && smtpPass;
  
  if (explicitSmtpHost) {
    // Respect explicitly configured host (allows Google Workspace relay setup)
    smtpHost = explicitSmtpHost;
    if (isDevelopment) {
      console.log(`[SMTP] Using configured SMTP_HOST: ${smtpHost}`);
      if (hasCredentials) {
        console.log("[SMTP] ✓ Authentication enabled (SMTP_USER/SMTP_PASS provided)");
        console.log("[SMTP] ✓ From email will be:", smtpUser);
      } else if (smtpHost === "smtp-relay.gmail.com") {
        console.log("[SMTP] ℹ Using Google Workspace SMTP Relay (IP-based authentication)");
        console.log("[SMTP] ℹ Make sure your server IP is allowlisted in Google Admin Console");
      } else {
        console.warn(
          "[SMTP] ⚠ No SMTP_USER/SMTP_PASS provided. Authentication may fail."
        );
      }
    }
  } else if (hasCredentials) {
    // No SMTP_HOST set, but credentials provided - use smtp.gmail.com
    smtpHost = "smtp.gmail.com";
    if (isDevelopment) {
      console.log("[SMTP] ✓ Using Google SMTP (smtp.gmail.com) with authentication");
      console.log("[SMTP] ✓ From email will be:", smtpUser);
      console.log("[SMTP] ℹ Note: For Google Workspace relay, set SMTP_HOST=smtp-relay.gmail.com");
    }
  } else {
    // Fallback to relay server (requires IP allowlisting, no auth)
    smtpHost = "smtp-relay.gmail.com";
    if (isDevelopment) {
      console.log("[SMTP] Using Google Workspace SMTP Relay (smtp-relay.gmail.com)");
      console.log("[SMTP] ℹ IP-based authentication - server IP must be allowlisted");
      console.log("[SMTP] ℹ Configure in Google Admin: Apps → Google Workspace → Gmail → Routing → SMTP relay service");
    }
  }
  
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
  const isGmailSmtp = smtpHost === "smtp.gmail.com";
  const isGmailRelay = smtpHost === "smtp-relay.gmail.com";
  
  // Get HELO/EHLO hostname (important to avoid Google throttling)
  // Should match your server's actual hostname and PTR record
  const smtpHeloName = process.env.SMTP_HELO_NAME?.trim();
  
  // Log configuration in development
  if (isDevelopment) {
    console.log(`[SMTP] Configuration: host=${smtpHost}, port=${smtpPort}, hasAuth=${hasCredentials}`);
    if (hasCredentials) {
      console.log(`[SMTP] User: ${smtpUser}, Password: ${smtpPass ? "***" : "NOT SET"}`);
    }
    if (smtpHeloName) {
      console.log(`[SMTP] ✓ HELO/EHLO hostname: ${smtpHeloName}`);
    } else {
      console.warn(
        "[SMTP] ⚠ SMTP_HELO_NAME not set. Using default hostname (may trigger Google throttling).\n" +
        "[SMTP] ⚠ Set SMTP_HELO_NAME to your server's real hostname (same as PTR record target)."
      );
    }
    if (isGmailRelay) {
      console.log("[SMTP] ℹ Google Workspace Relay - typically has higher rate limits than smtp.gmail.com");
    }
  }

  // Build transporter config with settings optimized for each SMTP service
  interface SMTPTransportOptions {
    host: string;
    port: number;
    secure: boolean;
    requireTLS: boolean;
    name?: string; // Hostname for HELO/EHLO command (should match server's PTR record)
    tls: {
      rejectUnauthorized: boolean;
      minVersion: string;
    };
    logger?: boolean;
    debug?: boolean;
    pool?: boolean;
    maxConnections?: number;
    maxMessages?: number;
    rateDelta?: number;
    rateLimit?: number;
    auth?: {
      user: string;
      pass: string;
    };
  }

  // Connection pooling strategy:
  // - smtp.gmail.com: Disable pooling (strict rate limits, 421 errors common)
  // - smtp-relay.gmail.com: Conservative pooling (Google Workspace limits: ~100-200 emails/minute, 2000/day)
  // - Other hosts: Enable pooling with conservative settings
  const shouldPool = !isGmailSmtp; // Only disable pooling for smtp.gmail.com
  
  // Google Workspace SMTP Relay limits (conservative estimates):
  // - Per minute: ~100-200 emails (we'll use 100 to be safe)
  // - Per hour: ~2000 emails
  // - Per day: ~2000 emails (but can be higher with proper configuration)
  // We'll limit to 90 emails/minute (1.5/sec) to leave headroom
  const transportConfig: SMTPTransportOptions = {
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    requireTLS: smtpPort === 587, // Only require TLS for port 587
    // Set HELO/EHLO hostname to avoid Google throttling
    // This should match your server's real hostname (same as PTR record target)
    // If not set, Nodemailer may use 'localhost' or an IP, which triggers throttling
    ...(smtpHeloName && { name: smtpHeloName }),
    tls: {
      // Do not fail on invalid certs for development
      rejectUnauthorized: false,
      minVersion: "TLSv1.2",
    },
    // Connection pooling settings - conservative for Google Workspace relay
    pool: shouldPool, // Enable for relay, disable for smtp.gmail.com
    maxConnections: shouldPool ? (isGmailRelay ? 2 : 2) : 1, // Reduced from 5 to 2 to avoid overwhelming
    maxMessages: shouldPool ? (isGmailRelay ? 50 : 30) : 1, // Reduced from 100 to 50
    rateDelta: shouldPool ? (isGmailRelay ? 60000 : 60000) : 60000, // 1 minute window for all
    rateLimit: shouldPool ? (isGmailRelay ? 90 : 60) : 1, // 90/min for relay (1.5/sec), 60/min for others, 1/min for gmail
    // Optional: Enable connection logging for debugging
    // Disabled by default to reduce log spam - set SMTP_DEBUG=true to enable
    logger: process.env.SMTP_DEBUG === "true",
    debug: process.env.SMTP_DEBUG === "true",
  };

  // Add authentication if credentials are provided
  if (hasCredentials) {
    transportConfig.auth = {
      user: smtpUser!,
      pass: smtpPass!,
    };
  } else if (smtpHost === "smtp.gmail.com") {
    // Warn if trying to use smtp.gmail.com without credentials
    if (isDevelopment) {
      console.error(
        "[SMTP] ERROR: smtp.gmail.com requires authentication but SMTP_USER/SMTP_PASS are not set!\n" +
        "Please set SMTP_USER and SMTP_PASS environment variables."
      );
    }
  }

  cachedTransporter = nodemailer.createTransport(transportConfig as nodemailer.TransportOptions);
  return cachedTransporter;
}

// Reset transporter to clear bad connections (e.g., after rate limit errors)
function resetTransporter() {
  if (cachedTransporter) {
    try {
      cachedTransporter.close();
    } catch (e) {
      // Ignore errors when closing
    }
    cachedTransporter = null;
  }
}

// Check if error is a rate limit error
function isRateLimitError(error: Error & { code?: string; responseCode?: number; response?: string }): boolean {
  const errorCode = error.code;
  const responseCode = error.responseCode;
  const response = error.response?.toLowerCase() || '';
  const message = error.message?.toLowerCase() || '';
  
  // Check for 421 rate limit errors (Google SMTP) - most common
  if (responseCode === 421) {
    return true;
  }
  
  // Check for 450, 451, 452 errors (temporary failures, often rate limiting)
  if (responseCode === 450 || responseCode === 451 || responseCode === 452) {
    return true;
  }
  
  // Check for ECONNECTION with rate limit message
  if (errorCode === 'ECONNECTION' && (
    response.includes('rate limit') ||
    response.includes('try again later') ||
    response.includes('421') ||
    response.includes('temporarily unavailable') ||
    message.includes('rate limit') ||
    message.includes('421')
  )) {
    return true;
  }
  
  // Check for ETIMEDOUT which can indicate rate limiting
  if (errorCode === 'ETIMEDOUT' && (
    response.includes('421') ||
    message.includes('421')
  )) {
    return true;
  }
  
  return false;
}

// Email queue to prevent concurrent sends and respect rate limits
interface EmailQueueItem {
  to: string;
  subject: string;
  html: string;
  from: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
  replyTo?: string;
  logId: number;
  resolve: () => void;
  reject: (error: Error) => void;
}

let emailQueue: EmailQueueItem[] = [];
let isProcessingQueue = false;
let lastEmailSentAt = 0;

// Email sending metrics for rate limiting and diagnostics
interface EmailMetrics {
  sentPerMinute: Array<{ timestamp: number; count: number }>;
  sentPerHour: Array<{ timestamp: number; count: number }>;
  totalSent: number;
  rateLimitErrors: number;
  lastRateLimitError?: number;
}

let emailMetrics: EmailMetrics = {
  sentPerMinute: [],
  sentPerHour: [],
  totalSent: 0,
  rateLimitErrors: 0,
};

// Clean up old metrics entries (keep last 60 minutes of per-minute data, last 24 hours of per-hour data)
function cleanupMetrics() {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  
  emailMetrics.sentPerMinute = emailMetrics.sentPerMinute.filter(m => m.timestamp > oneHourAgo);
  emailMetrics.sentPerHour = emailMetrics.sentPerHour.filter(m => m.timestamp > oneDayAgo);
}

// Record email sent
function recordEmailSent() {
  const now = Date.now();
  emailMetrics.totalSent++;
  
  // Update per-minute counter
  const currentMinute = Math.floor(now / 60000) * 60000;
  const minuteEntry = emailMetrics.sentPerMinute.find(m => m.timestamp === currentMinute);
  if (minuteEntry) {
    minuteEntry.count++;
  } else {
    emailMetrics.sentPerMinute.push({ timestamp: currentMinute, count: 1 });
  }
  
  // Update per-hour counter
  const currentHour = Math.floor(now / (60 * 60 * 1000)) * (60 * 60 * 1000);
  const hourEntry = emailMetrics.sentPerHour.find(m => m.timestamp === currentHour);
  if (hourEntry) {
    hourEntry.count++;
  } else {
    emailMetrics.sentPerHour.push({ timestamp: currentHour, count: 1 });
  }
  
  cleanupMetrics();
}

// Get current email sending rate
function getCurrentEmailRate(): { perMinute: number; perHour: number } {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneHourAgo = now - 60 * 60 * 1000;
  
  const recentMinutes = emailMetrics.sentPerMinute.filter(m => m.timestamp > oneMinuteAgo);
  const recentHours = emailMetrics.sentPerHour.filter(m => m.timestamp > oneHourAgo);
  
  const perMinute = recentMinutes.reduce((sum, m) => sum + m.count, 0);
  const perHour = recentHours.reduce((sum, m) => sum + m.count, 0);
  
  return { perMinute, perHour };
}

// Determine minimum delay between emails based on SMTP host and current rate
// smtp.gmail.com has strict rate limits (421 errors), relay is more lenient
function getMinEmailDelay(): number {
  const smtpHost = process.env.SMTP_HOST?.trim();
  const hasCredentials = process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim();
  const isGmailSmtp = !smtpHost && hasCredentials; // If no SMTP_HOST but has credentials, using smtp.gmail.com
  const isGmailRelay = smtpHost === "smtp-relay.gmail.com" || (!smtpHost && !hasCredentials);
  
  // Get current sending rate
  const { perMinute, perHour } = getCurrentEmailRate();
  
  // Google Workspace SMTP Relay limits (conservative):
  // - Per minute: ~100-200 emails (use 90 as safe limit)
  // - Per hour: ~2000 emails (use 1800 as safe limit)
  // - Per day: ~2000 emails
  if (isGmailSmtp || smtpHost === "smtp.gmail.com") {
    // smtp.gmail.com: 3 seconds to avoid 421 errors
    return 3000;
  } else if (isGmailRelay) {
    // smtp-relay.gmail.com: Dynamic delay based on current rate
    // If we're approaching limits, slow down
    if (perMinute >= 85) {
      // Very close to limit, wait 2 seconds
      return 2000;
    } else if (perMinute >= 70) {
      // Getting close, wait 1.5 seconds
      return 1500;
    } else if (perHour >= 1700) {
      // Hourly limit approaching, wait 2 seconds
      return 2000;
    } else {
      // Normal operation, 1 second between emails (60/min max)
      return 1000;
    }
  } else {
    // Other SMTP servers: 2 seconds (conservative default)
    return 2000;
  }
}

// Check if we should delay sending due to rate limits
function shouldDelayDueToRateLimit(): { shouldDelay: boolean; delayMs: number; reason: string } {
  const smtpHost = process.env.SMTP_HOST?.trim();
  const hasCredentials = process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim();
  const isGmailRelay = smtpHost === "smtp-relay.gmail.com" || (!smtpHost && !hasCredentials);
  
  if (!isGmailRelay) {
    return { shouldDelay: false, delayMs: 0, reason: "" };
  }
  
  const { perMinute, perHour } = getCurrentEmailRate();
  
  // Google Workspace limits (conservative)
  const MAX_PER_MINUTE = 90;
  const MAX_PER_HOUR = 1800;
  
  if (perMinute >= MAX_PER_MINUTE) {
    // Calculate how long to wait until next minute window
    const now = Date.now();
    const nextMinute = Math.ceil(now / 60000) * 60000;
    const delayMs = nextMinute - now + 100; // Add 100ms buffer
    return {
      shouldDelay: true,
      delayMs,
      reason: `Rate limit: ${perMinute} emails in last minute (max: ${MAX_PER_MINUTE}/min)`,
    };
  }
  
  if (perHour >= MAX_PER_HOUR) {
    // Calculate how long to wait until next hour window
    const now = Date.now();
    const nextHour = Math.ceil(now / (60 * 60 * 1000)) * (60 * 60 * 1000);
    const delayMs = nextHour - now + 1000; // Add 1s buffer
    return {
      shouldDelay: true,
      delayMs,
      reason: `Rate limit: ${perHour} emails in last hour (max: ${MAX_PER_HOUR}/hour)`,
    };
  }
  
  return { shouldDelay: false, delayMs: 0, reason: "" };
}

// MIN_EMAIL_DELAY_MS is now calculated dynamically via getMinEmailDelay()

// Process email queue with rate limiting
async function processEmailQueue() {
  // Lazy import to avoid circular dependency at module load
  const { emailJobManager } = await import("@/lib/email-job-manager");

  if (isProcessingQueue || emailQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  while (emailQueue.length > 0) {
    const item = emailQueue.shift();
    if (!item) break;

    emailJobManager.logEmailSending(item.logId);

    try {
      // Check if we need to delay due to rate limits (per-minute/per-hour)
      const rateLimitCheck = shouldDelayDueToRateLimit();
      if (rateLimitCheck.shouldDelay) {
        console.warn(`[Email Queue] ${rateLimitCheck.reason}. Delaying ${Math.round(rateLimitCheck.delayMs / 1000)}s...`);
        console.warn(`[Email Queue] Queue length: ${emailQueue.length} emails waiting`);
        await new Promise(resolve => setTimeout(resolve, rateLimitCheck.delayMs));
      }
      
      // Ensure minimum delay between emails (rate limiting based on SMTP service)
      const minDelay = getMinEmailDelay();
      const timeSinceLastEmail = Date.now() - lastEmailSentAt;
      if (timeSinceLastEmail < minDelay) {
        const waitTime = minDelay - timeSinceLastEmail;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      // Send the email with retry logic
      await sendEmailWithRetry(item.to, item.subject, item.html, item.from, item.attachments, item.replyTo);
      lastEmailSentAt = Date.now();
      recordEmailSent();
      emailJobManager.logEmailSent(item.logId);
      item.resolve();
    } catch (error) {
      const err = error as Error & { responseCode?: number; code?: string };
      emailJobManager.logEmailFailed(
        item.logId,
        err.message || "Unknown error"
      );
      // Record rate limit errors
      if (isRateLimitError(err)) {
        emailMetrics.rateLimitErrors++;
        emailMetrics.lastRateLimitError = Date.now();
        const { perMinute, perHour } = getCurrentEmailRate();
        console.error(
          `[Email Queue] Rate limit error encountered. ` +
          `Current rate: ${perMinute}/min, ${perHour}/hour. ` +
          `Total rate limit errors: ${emailMetrics.rateLimitErrors}`
        );
      }
      item.reject(error as Error);
    }
  }

  isProcessingQueue = false;
}

// Internal function to send email with retry logic
async function sendEmailWithRetry(
  to: string,
  subject: string,
  html: string,
  from: string,
  attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>,
  replyTo?: string
): Promise<void> {
  // Retry logic for rate-limited connections
  // Google SMTP 421 errors can require 5+ minutes to recover
  const maxRetries = 5;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Reset transporter on each attempt to get a fresh connection
      // This is important after rate limit errors
      if (attempt > 1) {
        resetTransporter();
        // Add a small delay before retrying to let connections clear
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Get transporter (will create new one if reset)
      const transporter = getTransporter();
      
      await transporter.sendMail({
        from,
        to,
        subject,
        html,
        ...(replyTo && { replyTo }),
        ...(attachments?.length && {
          attachments: attachments.map((a) => ({
            filename: a.filename,
            content: a.content,
            contentType: a.contentType,
          })),
        }),
      });
      
      // Success - for Gmail, we don't pool connections, so we can keep the transporter
      // The connection will be reused if another email comes quickly
      // For non-pooled connections, nodemailer will handle cleanup automatically
      
      return; // Success, exit function
    } catch (error) {
      const err = error as Error & { code?: string; responseCode?: number; response?: string; command?: string };
      lastError = err;

      // Check if this is a rate limit error
      if (isRateLimitError(err) && attempt < maxRetries) {
        // Reset transporter to clear bad connections
        resetTransporter();
        
        // Record rate limit error with context
        emailMetrics.rateLimitErrors++;
        emailMetrics.lastRateLimitError = Date.now();
        const { perMinute, perHour } = getCurrentEmailRate();
        const queueLength = emailQueue.length;
        
        // For 421 errors (Gmail rate limit), use much longer wait times
        // 421 errors indicate the server is temporarily unavailable
        // Gmail can take 5-15 minutes to recover from rate limiting
        const is421Error = err.responseCode === 421;
        let baseWaitTime: number;
        
        if (is421Error) {
          // For 421 errors, use longer waits: 5min, 10min, 15min, 20min
          baseWaitTime = Math.min(5 * 60 * 1000 * attempt, 20 * 60 * 1000); // Cap at 20 minutes
        } else {
          // For other rate limit errors, use shorter waits: 1min, 2min, 5min, 10min
          baseWaitTime = Math.min(
            Math.pow(2, attempt - 1) * 60 * 1000,
            10 * 60 * 1000
          ); // Cap at 10 minutes
        }
        
        // Add jitter (±15%) to prevent synchronized retries
        const jitter = baseWaitTime * 0.15 * (Math.random() * 2 - 1);
        const waitTime = Math.max(Math.floor(baseWaitTime + jitter), 30000); // Minimum 30 seconds
        
        const waitMinutes = Math.round(waitTime / 60000 * 10) / 10; // Round to 1 decimal place
        
        // Enhanced logging with diagnostics
        console.error(
          `[Email Rate Limit] Attempt ${attempt}/${maxRetries} failed with error ${err.responseCode || err.code}\n` +
          `  Error: ${err.message || 'Unknown error'}\n` +
          `  Response: ${err.response || 'No response'}\n` +
          `  Current rate: ${perMinute} emails/min, ${perHour} emails/hour\n` +
          `  Queue length: ${queueLength} emails waiting\n` +
          `  Total rate limit errors: ${emailMetrics.rateLimitErrors}\n` +
          `  Retrying in ${waitMinutes} minutes...\n` +
          `  Recommendations:\n` +
          `    - Check if you're sending too many emails in a short time\n` +
          `    - Verify Google Workspace SMTP relay configuration\n` +
          `    - Consider reducing email volume or using a dedicated email service\n` +
          `    - Monitor /api/email-metrics for detailed statistics`
        );
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      // For other errors or final attempt, provide helpful error message
      const errorMessage = err.message || String(error);
      
      // Check for common authentication errors and provide helpful guidance
      if (err.code === 'EAUTH' || errorMessage.includes('Application-specific password')) {
        console.error(
          "[Email] Authentication failed. Common causes:\n" +
          "1. Gmail requires an App Password (not your regular password) if 2FA is enabled\n" +
          "2. Generate an App Password at: https://myaccount.google.com/apppasswords\n" +
          "3. Make sure SMTP_USER and SMTP_PASS are set correctly in your .env.local file\n" +
          "4. Ensure you're using smtp.gmail.com (not smtp-relay.gmail.com) with credentials"
        );
      } else if (errorMessage.includes('Invalid login')) {
        console.error(
          "[Email] Invalid login credentials. Please check:\n" +
          "1. SMTP_USER should be your full Gmail address (e.g., yourname@gmail.com)\n" +
          "2. SMTP_PASS should be an App Password (16 characters, no spaces)\n" +
          "3. Make sure 2-Step Verification is enabled in your Google Account"
        );
      }
      
      console.error("Failed to send email:", error);
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }

  // If we exhausted all retries, throw the last error
  if (lastError) {
    throw lastError;
  }
}

// Export function to get email metrics (for diagnostics)
export async function getEmailMetrics(): Promise<EmailMetrics & { currentRate: { perMinute: number; perHour: number } }> {
  return {
    ...emailMetrics,
    currentRate: getCurrentEmailRate(),
  };
}

/** Live SMTP queue stats for the admin dashboard */
export async function getSmtpQueueStats() {
  const { perMinute, perHour } = getCurrentEmailRate();
  return {
    queueLength: emailQueue.length,
    totalSent: emailMetrics.totalSent,
    ratePerMinute: perMinute,
    ratePerHour: perHour,
    rateLimitErrors: emailMetrics.rateLimitErrors,
  };
}

export async function sendEmail({
  to,
  subject,
  html,
  from,
  attachments,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
  replyTo?: string;
}) {
  // Determine the from email priority:
  // 1. Explicit 'from' parameter (highest priority)
  // 2. SMTP_FROM_EMAIL env variable
  // 3. SMTP_USER (Gmail account email) if using Google SMTP with credentials
  // 4. Fallback to noreply@example.com
  const smtpUser = process.env.SMTP_USER?.trim();
  const defaultFromEmail = process.env.SMTP_FROM_EMAIL?.trim();
  const fromEmail = from || defaultFromEmail || smtpUser || "noreply@example.com";
  
  // Log email queueing with metrics
  const { perMinute, perHour } = getCurrentEmailRate();
  const queueLength = emailQueue.length;
  
  if (process.env.NODE_ENV === "development" || queueLength > 10) {
    console.log(
      `[Email] Queueing email from: ${fromEmail} to: ${to} ` +
      `(Queue: ${queueLength}, Rate: ${perMinute}/min, ${perHour}/hour)`
    );
  }
  
  if (!smtpUser && !defaultFromEmail && !from && process.env.NODE_ENV === "development") {
    console.warn(
      `[Email] No 'from' address specified. Using fallback: ${fromEmail}\n` +
      `Set SMTP_FROM_EMAIL or SMTP_USER to customize the sender address.`
    );
  }
  
  // Warn if queue is getting long
  if (queueLength > 50) {
    console.warn(
      `[Email] Email queue is very long (${queueLength} emails). ` +
      `This may indicate rate limiting issues. Current rate: ${perMinute}/min, ${perHour}/hour`
    );
  }

  // Log to global email tracker (lazy import to avoid circular dependency)
  const { emailJobManager } = await import("@/lib/email-job-manager");
  const logId = emailJobManager.logEmailQueued(to, subject, fromEmail);

  // Queue the email to prevent concurrent sends and respect rate limits
  return new Promise<void>((resolve, reject) => {
    emailQueue.push({
      to,
      subject,
      html,
      from: fromEmail,
      attachments,
      replyTo,
      logId,
      resolve,
      reject,
    });

    // Start processing the queue if not already processing
    processEmailQueue().catch(reject);
  });
}
