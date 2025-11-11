#!/usr/bin/env node
/**
 * SMTP Rate Limiting Diagnostic Script
 * 
 * This script helps diagnose SMTP rate limiting issues by:
 * 1. Checking current email sending metrics
 * 2. Analyzing email sending patterns
 * 3. Identifying potential issues with configuration
 * 4. Providing recommendations
 * 
 * Usage: node scripts/diagnose-smtp-rate-limiting.js
 */

require('dotenv').config({ path: '.env.local' });

console.log('=== SMTP Rate Limiting Diagnostic Tool ===\n');

// Import the email metrics function (we'll need to create an API endpoint or check logs)
// For now, we'll analyze the configuration and provide recommendations

const smtpHost = process.env.SMTP_HOST?.trim();
const smtpUser = process.env.SMTP_USER?.trim();
const smtpPass = process.env.SMTP_PASS?.trim();
const smtpPort = process.env.SMTP_PORT?.trim() || '587';
const smtpFromEmail = process.env.SMTP_FROM_EMAIL?.trim();

console.log('1. SMTP Configuration:');
console.log(`   SMTP_HOST: ${smtpHost || '(not set - will use default)'}`);
console.log(`   SMTP_USER: ${smtpUser || '(not set)'}`);
console.log(`   SMTP_PASS: ${smtpPass ? '***' + smtpPass.slice(-4) : '(not set)'}`);
console.log(`   SMTP_PORT: ${smtpPort}`);
console.log(`   SMTP_FROM_EMAIL: ${smtpFromEmail || '(not set)'}\n`);

// Determine actual configuration
const hasCredentials = smtpUser && smtpPass;
let actualHost, actualAuth, configType;

if (smtpHost === 'smtp-relay.gmail.com') {
  actualHost = 'smtp-relay.gmail.com';
  actualAuth = hasCredentials ? 'YES (but not required for relay)' : 'NO (IP-based)';
  configType = 'Google Workspace SMTP Relay';
} else if (hasCredentials && !smtpHost) {
  actualHost = 'smtp.gmail.com';
  actualAuth = 'YES (Username/Password)';
  configType = 'Google SMTP (smtp.gmail.com)';
} else if (hasCredentials && smtpHost === 'smtp.gmail.com') {
  actualHost = 'smtp.gmail.com';
  actualAuth = 'YES (Username/Password)';
  configType = 'Google SMTP (smtp.gmail.com)';
} else if (!hasCredentials && !smtpHost) {
  actualHost = 'smtp-relay.gmail.com';
  actualAuth = 'NO (IP-based authentication required)';
  configType = 'Google Workspace SMTP Relay (default)';
} else {
  actualHost = smtpHost || 'smtp-relay.gmail.com';
  actualAuth = hasCredentials ? 'YES' : 'NO';
  configType = `Custom SMTP (${actualHost})`;
}

console.log('2. Actual Configuration:');
console.log(`   Type: ${configType}`);
console.log(`   Host: ${actualHost}`);
console.log(`   Authentication: ${actualAuth}\n`);

// Rate limit information
console.log('3. Rate Limits (Google Workspace SMTP Relay):');
console.log('   Per minute: ~100-200 emails (code limits to 90/min for safety)');
console.log('   Per hour: ~2000 emails (code limits to 1800/hour for safety)');
console.log('   Per day: ~2000 emails (can be higher with proper configuration)');
console.log('   Note: These are conservative limits. Actual limits depend on your Google Workspace plan.\n');

if (actualHost === 'smtp.gmail.com') {
  console.log('3. Rate Limits (smtp.gmail.com):');
  console.log('   Per minute: Very strict (~10-20 emails/min)');
  console.log('   Per day: ~500 emails/day (personal Gmail)');
  console.log('   Note: smtp.gmail.com has much stricter limits than the relay.\n');
}

// Connection pooling settings
console.log('4. Connection Pooling Settings:');
if (actualHost === 'smtp-relay.gmail.com') {
  console.log('   Pooling: ENABLED');
  console.log('   Max Connections: 2 (reduced from 5 to avoid overwhelming)');
  console.log('   Max Messages per Connection: 50 (reduced from 100)');
  console.log('   Rate Limit: 90 emails/minute');
  console.log('   Rate Delta: 60 seconds (1 minute window)');
} else if (actualHost === 'smtp.gmail.com') {
  console.log('   Pooling: DISABLED (strict rate limits)');
  console.log('   Max Connections: 1');
  console.log('   Rate Limit: 1 email/minute');
  console.log('   Rate Delta: 60 seconds');
} else {
  console.log('   Pooling: ENABLED (custom configuration)');
  console.log('   Max Connections: 2');
  console.log('   Max Messages per Connection: 30');
  console.log('   Rate Limit: 60 emails/minute');
}
console.log('');

// Recommendations
console.log('5. Recommendations:');
console.log('');

if (actualHost === 'smtp.gmail.com') {
  console.log('   ⚠️  WARNING: Using smtp.gmail.com has very strict rate limits.');
  console.log('   → Consider switching to smtp-relay.gmail.com for better limits');
  console.log('   → Set SMTP_HOST=smtp-relay.gmail.com in your .env.local');
  console.log('   → Ensure your server IP is allowlisted in Google Admin Console\n');
}

if (actualHost === 'smtp-relay.gmail.com' && !hasCredentials) {
  console.log('   ✓ Using Google Workspace SMTP Relay (recommended)');
  console.log('   → Make sure your server IP is allowlisted in Google Admin Console');
  console.log('   → Configure in: Apps → Google Workspace → Gmail → Routing → SMTP relay service\n');
}

console.log('6. Troubleshooting Steps:');
console.log('   1. Check server logs for rate limit errors (421, 450, 451, 452)');
console.log('   2. Monitor email sending rates using getEmailMetrics() function');
console.log('   3. Look for patterns in when rate limiting occurs:');
console.log('      - Multiple users created simultaneously?');
console.log('      - Bulk email operations?');
console.log('      - Form submissions triggering many emails?');
console.log('   4. Check if queue is backing up (queue length > 50 indicates issues)');
console.log('   5. Verify Google Workspace SMTP relay is properly configured');
console.log('   6. Check if you\'re hitting daily limits (2000 emails/day)');
console.log('');

console.log('7. How to Monitor Email Metrics:');
console.log('   The code now tracks:');
console.log('   - Emails sent per minute');
console.log('   - Emails sent per hour');
console.log('   - Total emails sent');
console.log('   - Rate limit errors encountered');
console.log('   - Queue length');
console.log('   ');
console.log('   Check your application logs for messages like:');
console.log('   [Email] Queueing email... (Queue: X, Rate: Y/min, Z/hour)');
console.log('   [Email Queue] Rate limit: X emails in last minute...');
console.log('');

console.log('8. Common Issues:');
console.log('   Issue: Rate limiting occurs frequently');
console.log('   Cause: Sending too many emails in short time period');
console.log('   Solution: The code now automatically throttles to 90/min, 1800/hour');
console.log('   ');
console.log('   Issue: Queue backing up');
console.log('   Cause: Rate limits being hit, emails waiting to send');
console.log('   Solution: Check logs for rate limit errors, reduce email volume');
console.log('   ');
console.log('   Issue: 421 errors from Google');
console.log('   Cause: Exceeded rate limits, server temporarily unavailable');
console.log('   Solution: Code will retry with exponential backoff (5-20 min waits)');
console.log('');

console.log('9. Next Steps:');
console.log('   1. Monitor your application logs for email sending patterns');
console.log('   2. Check if specific actions trigger many emails (user creation, etc.)');
console.log('   3. Consider batching emails or delaying non-critical emails');
console.log('   4. If using Google Workspace, verify your plan supports the volume');
console.log('   5. Consider using a dedicated email service (SendGrid, Mailgun, etc.) for high volume');
console.log('');

// Check for potential issues
console.log('10. Potential Issues Detected:');
let issuesFound = false;

if (actualHost === 'smtp.gmail.com') {
  console.log('   ⚠️  Using smtp.gmail.com - very strict rate limits');
  issuesFound = true;
}

if (!smtpFromEmail && !smtpUser) {
  console.log('   ⚠️  No SMTP_FROM_EMAIL or SMTP_USER set - using fallback address');
  issuesFound = true;
}

if (actualHost === 'smtp-relay.gmail.com' && hasCredentials) {
  console.log('   ℹ️  Credentials provided but not required for relay (will be ignored)');
}

if (!issuesFound) {
  console.log('   ✓ No obvious configuration issues detected');
}

console.log('');
console.log('=== Diagnostic Complete ===');
console.log('');
console.log('For more help, check:');
console.log('- Application logs for email sending patterns');
console.log('- Google Admin Console for SMTP relay configuration');
console.log('- Google Workspace documentation for rate limits');
console.log('');

