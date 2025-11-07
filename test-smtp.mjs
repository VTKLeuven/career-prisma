#!/usr/bin/env node

/**
 * SMTP Connection Test Script
 * 
 * This script tests your SMTP configuration independently of your Next.js app.
 * 
 * Usage:
 *   node test-smtp.mjs
 * 
 * Or to test with authentication:
 *   SMTP_USER=your-email@vtk.be SMTP_PASS=your-app-password node test-smtp.mjs
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env.local') });

const config = {
  host: process.env.SMTP_HOST || 'smtp-relay.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@vtk.be',
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
};

console.log('🔧 SMTP Configuration Test');
console.log('==========================');
console.log(`Host: ${config.host}`);
console.log(`Port: ${config.port}`);
console.log(`From: ${config.fromEmail}`);
console.log(`Auth: ${config.user ? `Enabled (${config.user})` : 'Disabled (IP-based)'}`);
console.log('==========================\n');

const transportConfig = {
  host: config.host,
  port: config.port,
  secure: config.port === 465,
  requireTLS: true,
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2',
  },
  debug: true,
  logger: true,
};

if (config.user && config.pass) {
  transportConfig.auth = {
    user: config.user,
    pass: config.pass,
  };
}

const transporter = nodemailer.createTransport(transportConfig);

console.log('🔌 Testing SMTP connection...\n');

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Connection verification FAILED:');
    console.error(error);
    console.error('\n📋 Troubleshooting steps:');
    console.error('1. Check if your server IP is whitelisted in Google Workspace Admin');
    console.error('2. If using auth, verify SMTP_USER and SMTP_PASS are correct');
    console.error('3. Ensure port 587 is not blocked by firewall');
    console.error('4. Check Google Workspace Admin > Apps > Gmail > SMTP relay service');
    console.error('\nSee SMTP_TROUBLESHOOTING.md for detailed instructions.');
    process.exit(1);
  } else {
    console.log('✅ Connection verified successfully!\n');
    console.log('📧 Attempting to send a test email...\n');
    
    const testEmail = process.argv[2] || 'test@example.com';
    
    transporter.sendMail({
      from: config.fromEmail,
      to: testEmail,
      subject: 'SMTP Test Email',
      text: 'This is a test email from your SMTP configuration.',
      html: '<p>This is a test email from your SMTP configuration.</p>',
    }, (err, info) => {
      if (err) {
        console.error('❌ Send FAILED:');
        console.error(err);
        process.exit(1);
      } else {
        console.log('✅ Email sent successfully!');
        console.log('📊 Response:', info.response);
        console.log('📬 Message ID:', info.messageId);
        console.log('\n🎉 Your SMTP configuration is working correctly!');
        process.exit(0);
      }
    });
  }
});

