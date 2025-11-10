"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requestCompanyPageAction } from "@/app/actions/companies";

export default function RequestCompanyPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest() {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await requestCompanyPageAction();
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || "Failed to send request");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <Link
        href="/dashboard/settings/information"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft size={16} />
        Back to Company Information
      </Link>

      <Card className="rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Company Page on Platform</CardTitle>
          <CardDescription>
            Get your own dedicated company page on our platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="prose max-w-none">
            <p className="text-lg text-muted-foreground">
              A company page on our platform allows you to showcase your company to potential candidates and visitors.
              Your page will be publicly accessible and include all your company information, logo, and descriptions.
            </p>

            <div className="mt-6 p-6 bg-muted rounded-lg">
              <h3 className="text-xl font-semibold mb-4">What&apos;s included:</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Public company profile page</li>
                <li>Company logo and background image</li>
                <li>Short and long descriptions</li>
                <li>Company location and website</li>
                <li>Master categories</li>
                <li>Links to your company from event pages</li>
              </ul>
            </div>

            <div className="mt-6 p-6 border-2 border-primary rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">€200</h3>
                  <p className="text-sm text-muted-foreground mt-1">Yearly fee, also included in Jobfair Package</p>
                </div>
                <Button
                  size="lg"
                  className="cursor-pointer"
                  onClick={handleRequest}
                  disabled={loading || success}
                >
                  {loading ? "Sending Request..." : success ? "Request Sent" : "Request Company Page"}
                </Button>
              </div>
            </div>

            {success && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                <p className="font-semibold">Request sent successfully!</p>
                <p className="text-sm mt-1">
                  Your request has been sent to your salesperson. They will review it and activate your company page once approved.
                </p>
              </div>
            )}

            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                <p className="font-semibold">Error</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            )}

            <div className="mt-6 text-sm text-muted-foreground">
              <p>
                After your request is approved, your company page will be activated and visible on the platform.
                You can always update your company information from the settings page.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

