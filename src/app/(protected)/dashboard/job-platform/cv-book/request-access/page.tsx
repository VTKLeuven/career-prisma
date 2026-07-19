"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requestCVBookAccessAction } from "@/app/actions/companies";
import { IconFileCv } from "@tabler/icons-react";
import { getCVBookSubOption } from "@/lib/repos/option";

export default function RequestCVBookAccessPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [price, setPrice] = useState<string | null>(null);

  useEffect(() => {
    async function loadPrice() {
      try {
        // Resolve CV Book access from the company's configured sub-options.
        const cvBookSubOption = await getCVBookSubOption();
        if (cvBookSubOption?.price) {
          setPrice(cvBookSubOption.price);
        }
      } catch (err) {
        console.error("Error loading CV Book price:", err);
      }
    }

    loadPrice();
  }, []);

  async function handleRequest() {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await requestCVBookAccessAction();
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
      <Card className="rounded-2xl shadow-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-vtk-blue/10 p-6">
              <IconFileCv className="h-16 w-16 text-vtk-blue" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">CV Book Access</CardTitle>
          <CardDescription className="text-center">
            Request access to browse student CVs and connect with talented candidates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="prose max-w-none">
            <p className="text-lg text-muted-foreground">
              The CV Book feature allows you to browse student CVs, search for candidates by skills and experience, 
              and connect with talented students from the engineering faculty.
            </p>

            <div className="mt-6 p-6 bg-muted rounded-lg">
              <h3 className="text-xl font-semibold mb-4">What&apos;s included:</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Browse student CVs from the engineering faculty</li>
                <li>Search for candidates by skills and experience</li>
                <li>Filter candidates by master programs</li>
              </ul>
            </div>

            <div className="mt-6 p-6 border-2 border-primary rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  {price && (
                    <>
                      <h3 className="text-2xl font-bold">€{price}</h3>
                      <p className="text-sm text-muted-foreground mt-1">Price for this year&apos;s CV Book</p>
                    </>
                  )}
                  {!price && (
                    <>
                      <h3 className="text-2xl font-bold">Request Access</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your request will be sent to your salesperson for approval
                      </p>
                    </>
                  )}
                </div>
                <Button
                  size="lg"
                  className="cursor-pointer"
                  onClick={handleRequest}
                  disabled={loading || success}
                >
                  {loading ? "Sending Request..." : success ? "Request Sent" : "Request CV Book Access"}
                </Button>
              </div>
            </div>

            {success && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                <p className="font-semibold">Request sent successfully!</p>
                <p className="text-sm mt-1">
                  Your request has been sent to your salesperson. They will review it and activate CV Book access 
                  for your company once approved.
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
                After your request is approved, you&apos;ll be able to access the CV Book feature from the Job Platform 
                section in your dashboard.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
