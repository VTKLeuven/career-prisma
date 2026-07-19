import { NextResponse } from "next/server";
import { getEmailMetrics } from "@/lib/email";

/**
 * API endpoint to get email sending metrics for diagnostics
 * 
 * GET /api/email-metrics
 * 
 * Returns:
 * - Current email sending rate (per minute, per hour)
 * - Total emails sent
 * - Rate limit errors encountered
 * - Queue status
 */
export async function GET() {
  try {
    const metrics = await getEmailMetrics();
    
    // Format the response with human-readable timestamps
    const response = {
      currentRate: metrics.currentRate,
      totalSent: metrics.totalSent,
      rateLimitErrors: metrics.rateLimitErrors,
      lastRateLimitError: metrics.lastRateLimitError 
        ? new Date(metrics.lastRateLimitError).toISOString()
        : null,
      metrics: {
        perMinute: metrics.sentPerMinute.map(m => ({
          timestamp: new Date(m.timestamp).toISOString(),
          count: m.count,
        })),
        perHour: metrics.sentPerHour.map(m => ({
          timestamp: new Date(m.timestamp).toISOString(),
          count: m.count,
        })),
      },
      limits: {
        maxPerMinute: 90, // Google Workspace SMTP Relay limit (conservative)
        maxPerHour: 1800, // Google Workspace SMTP Relay limit (conservative)
        maxPerDay: 2000,  // Google Workspace SMTP Relay limit (conservative)
      },
      status: {
        isHealthy: metrics.currentRate.perMinute < 85 && metrics.currentRate.perHour < 1700,
        approachingLimit: metrics.currentRate.perMinute >= 70 || metrics.currentRate.perHour >= 1600,
        atLimit: metrics.currentRate.perMinute >= 90 || metrics.currentRate.perHour >= 1800,
      },
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error getting email metrics:", error);
    return NextResponse.json(
      { error: "Failed to get email metrics" },
      { status: 500 }
    );
  }
}

