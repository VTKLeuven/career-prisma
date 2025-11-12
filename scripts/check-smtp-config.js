#!/usr/bin/env node
/**
 * Script to check SMTP configuration and diagnose Google Workspace relay setup
 * 
 * Usage: node scripts/check-smtp-config.js
 * 
 * Note: This reads environment variables from your current shell environment.
 * For Next.js projects, make sure .env.local is loaded or set env vars manually.
 */

// Try to load .env.local if dotenv is available, otherwise use process.env
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // dotenv not available, use process.env (will be empty unless set in shell)
  console.log('Note: dotenv not available. Reading from process.env only.\n');
}

console.log('=== SMTP Configuration Check ===\n');

const smtpHost = process.env.SMTP_HOST?.trim();
const smtpUser = process.env.SMTP_USER?.trim();
const smtpPass = process.env.SMTP_PASS?.trim();
const smtpPort = process.env.SMTP_PORT?.trim() || '587';
const smtpFromEmail = process.env.SMTP_FROM_EMAIL?.trim();
const smtpHeloName = process.env.SMTP_HELO_NAME?.trim();

console.log('Environment Variables:');
console.log(`  SMTP_HOST: ${smtpHost || '(not set)'}`);
console.log(`  SMTP_USER: ${smtpUser || '(not set)'}`);
console.log(`  SMTP_PASS: ${smtpPass ? '***' + smtpPass.slice(-4) : '(not set)'}`);
console.log(`  SMTP_PORT: ${smtpPort}`);
console.log(`  SMTP_FROM_EMAIL: ${smtpFromEmail || '(not set)'}`);
console.log(`  SMTP_HELO_NAME: ${smtpHeloName || '(not set - recommended!)'}`);
console.log('');

// Determine what the code will actually use
let actualHost;
let actualAuth;
const hasCredentials = smtpUser && smtpPass;

if (hasCredentials && !smtpHost) {
  actualHost = 'smtp.gmail.com';
  actualAuth = 'YES (Username/Password)';
  console.log('⚠️  ISSUE: Credentials are set but SMTP_HOST is not set.');
  console.log('   → Code will use: smtp.gmail.com (OAuth2/App Password)');
  console.log('   → This is NOT a relay setup!\n');
} else if (hasCredentials && smtpHost === 'smtp-relay.gmail.com') {
  actualHost = 'smtp.gmail.com';
  actualAuth = 'YES (Username/Password)';
  console.log('⚠️  ISSUE: Credentials are set, but code will IGNORE smtp-relay.gmail.com');
  console.log('   → Code will force: smtp.gmail.com (OAuth2/App Password)');
  console.log('   → This is NOT using the relay!\n');
} else if (hasCredentials && smtpHost && smtpHost !== 'smtp.gmail.com') {
  actualHost = 'smtp.gmail.com';
  actualAuth = 'YES (Username/Password)';
  console.log('⚠️  ISSUE: Credentials are set, but code will IGNORE SMTP_HOST');
  console.log(`   → SMTP_HOST=${smtpHost} will be ignored`);
  console.log('   → Code will force: smtp.gmail.com (OAuth2/App Password)\n');
} else if (!hasCredentials && smtpHost === 'smtp-relay.gmail.com') {
  actualHost = 'smtp-relay.gmail.com';
  actualAuth = 'NO (IP-based authentication required)';
  console.log('✓ Using Google Workspace SMTP Relay');
  console.log('   → Host: smtp-relay.gmail.com');
  console.log('   → Authentication: IP-based (server IP must be allowlisted)\n');
} else if (!hasCredentials && smtpHost) {
  actualHost = smtpHost;
  actualAuth = 'NO (may fail without authentication)';
  console.log(`⚠️  Using custom SMTP host: ${smtpHost}`);
  console.log('   → No credentials provided - may fail\n');
} else {
  actualHost = 'smtp-relay.gmail.com';
  actualAuth = 'NO (IP-based authentication required)';
  console.log('✓ Using default Google Workspace SMTP Relay');
  console.log('   → Host: smtp-relay.gmail.com (default)');
  console.log('   → Authentication: IP-based (server IP must be allowlisted)\n');
}

console.log('Actual Configuration (what code will use):');
console.log(`  Host: ${actualHost}`);
console.log(`  Port: ${smtpPort}`);
console.log(`  Auth: ${actualAuth}`);
if (smtpHeloName) {
  console.log(`  HELO/EHLO: ${smtpHeloName} ✓`);
} else {
  console.log(`  HELO/EHLO: (not set - using default, may trigger throttling) ⚠️`);
}
console.log('');

// Check for HELO/EHLO name configuration
if (!smtpHeloName) {
  console.log('=== HELO/EHLO Hostname Configuration ===');
  console.log('');
  console.log('⚠️  SMTP_HELO_NAME is not set!');
  console.log('');
  console.log('This is important to avoid Google throttling:');
  console.log('1. Set SMTP_HELO_NAME to your server\'s real hostname');
  console.log('2. This should match your server\'s PTR record (reverse DNS)');
  console.log('3. Example: SMTP_HELO_NAME=mail.yourdomain.com');
  console.log('');
  console.log('Why it matters:');
  console.log('  → Without it, Nodemailer may send "localhost" or an IP address');
  console.log('  → Google throttles connections with invalid HELO/EHLO names');
  console.log('  → Setting it to a real hostname improves deliverability');
  console.log('');
}

// Check for Google Workspace relay setup
if (actualHost === 'smtp-relay.gmail.com') {
  console.log('=== Google Workspace SMTP Relay Setup ===');
  console.log('');
  console.log('For smtp-relay.gmail.com to work, you need:');
  console.log('1. Server IP must be allowlisted in Google Admin Console');
  console.log('   → Go to: https://admin.google.com');
  console.log('   → Apps → Google Workspace → Gmail → Routing');
  console.log('   → SMTP relay service → Add your server IP');
  console.log('');
  console.log('2. No authentication required if IP is allowlisted');
  console.log('3. Set SMTP_HELO_NAME to your server hostname (matches PTR record)');
  console.log('4. Rate limits:');
  console.log('   → 2,000 emails per day (free)');
  console.log('   → 10,000+ emails per day (paid plans)');
  console.log('   → No per-minute limits like smtp.gmail.com');
  console.log('');
} else if (actualHost === 'smtp.gmail.com') {
  console.log('=== Google SMTP (OAuth2/App Password) Setup ===');
  console.log('');
  console.log('You are using smtp.gmail.com which:');
  console.log('1. Requires App Password (not regular password)');
  console.log('2. Set SMTP_HELO_NAME to your server hostname (important!)');
  console.log('3. Has strict rate limits:');
  console.log('   → ~100-500 emails per day');
  console.log('   → Rate limited after few emails (421 errors)');
  console.log('4. This is NOT a relay setup');
  console.log('');
  console.log('⚠️  If you want to use Google Workspace relay:');
  console.log('   → Remove SMTP_USER and SMTP_PASS');
  console.log('   → Set SMTP_HOST=smtp-relay.gmail.com');
  console.log('   → Allowlist your server IP in Google Admin');
  console.log('');
}

// Test connection (optional)
console.log('=== Next Steps ===');
console.log('');
if (actualHost === 'smtp-relay.gmail.com' && hasCredentials) {
  console.log('To use Google Workspace relay:');
  console.log('1. Remove SMTP_USER and SMTP_PASS from .env.local');
  console.log('2. Ensure SMTP_HOST=smtp-relay.gmail.com (or leave unset)');
  console.log('3. Verify server IP is allowlisted in Google Admin');
  console.log('4. Restart your application');
} else if (actualHost === 'smtp.gmail.com' && smtpHost === 'smtp-relay.gmail.com') {
  console.log('To use Google Workspace relay:');
  console.log('1. Remove SMTP_USER and SMTP_PASS from .env.local');
  console.log('2. Keep SMTP_HOST=smtp-relay.gmail.com');
  console.log('3. Verify server IP is allowlisted in Google Admin');
  console.log('4. Restart your application');
}

