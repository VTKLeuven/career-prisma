"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";
import { formatDateTimeBE } from "@/lib/date-utils";

type AttendantInfo = {
  id: string;
  data: Record<string, unknown>;
  submitted_at: string;
  form_version_id: {
    form_id: {
      name: string;
    };
  };
};

export default function AttendantPage() {
  const params = useParams();
  const router = useRouter();
  const uuid = params.uuid as string;

  const [attendant, setAttendant] = useState<AttendantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [isCompanyRep, setIsCompanyRep] = useState(false);
  const [isUnauthenticated, setIsUnauthenticated] = useState(false);

  useEffect(() => {
    if (!uuid) {
      setError("Invalid attendant ID");
      setLoading(false);
      return;
    }

    const fetchAttendant = async () => {
      try {
        const response = await fetch(`/api/attendant/${uuid}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Attendant not found");
          } else {
            setError("Failed to load attendant information");
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setAttendant(data);

        // Check if user is a company rep and auto-scan
        try {
          const userCheckResponse = await fetch("/api/user/check");
          if (userCheckResponse.ok) {
            const userData = await userCheckResponse.json();
            // If authenticated company rep, auto-scan
            if (userData.authenticated && userData.company && !scanned) {
              setIsCompanyRep(true);
              setIsUnauthenticated(false);
              setScanning(true);
              try {
                const scanResponse = await fetch(`/api/attendant/${uuid}/scan`, {
                  method: "POST",
                });
                if (scanResponse.ok) {
                  setScanned(true);
                }
              } catch (scanErr) {
                console.error("Error auto-scanning attendant:", scanErr);
                // Don't show error to user - auto-scan is optional
              } finally {
                setScanning(false);
              }
            } else {
              // Either not authenticated or not a company rep
              setIsUnauthenticated(true);
            }
          }
        } catch (userErr) {
          // User check failed - treat as unauthenticated
          console.log("User not authenticated, skipping auto-scan");
          setIsUnauthenticated(true);
        }
      } catch (err) {
        console.error("Error fetching attendant:", err);
        setError("Failed to load attendant information");
      } finally {
        setLoading(false);
      }
    };

    fetchAttendant();
  }, [uuid, scanned]);

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !attendant) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold mb-2">Attendant Not Found</h2>
              <p className="text-muted-foreground mb-4">{error || "The attendant information could not be found."}</p>
              <Button onClick={() => router.push("/")}>Go to Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isUnauthenticated && !isCompanyRep) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 space-y-4">
              <h2 className="text-2xl font-bold mb-2">Company login required</h2>
              <p className="text-muted-foreground">
                To scan and view attendee details, please log in with your company account.
              </p>
              <Button onClick={() => router.push("/login")}>
                Go to company login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formName = typeof attendant.form_version_id === 'object' && attendant.form_version_id?.form_id
    ? (typeof attendant.form_version_id.form_id === 'object' ? attendant.form_version_id.form_id.name : '')
    : '';

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Attendant Information</CardTitle>
            {isCompanyRep && scanned && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Scanned</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {formName && (
            <div>
              <p className="text-sm text-muted-foreground">Event</p>
              <p className="font-medium">{formName}</p>
            </div>
          )}
          
          <div>
            <p className="text-sm text-muted-foreground">Registration Date</p>
            <p className="font-medium">{formatDateTimeBE(attendant.submitted_at)}</p>
          </div>

          <div className="border-t pt-4 space-y-3">
            <h3 className="font-semibold">Details</h3>
            {Object.entries(attendant.data).map(([key, value]) => {
              // Skip internal fields
              if (key.startsWith('_')) return null;
              
              const displayKey = key
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase())
                .trim();
              
              let displayValue: React.ReactNode = String(value || '');
              if (Array.isArray(value)) {
                displayValue = value.join(', ');
              } else if (value === null || value === undefined) {
                displayValue = <span className="text-muted-foreground italic">Not provided</span>;
              }

              return (
                <div key={key} className="flex flex-col gap-1">
                  <p className="text-sm text-muted-foreground">{displayKey}</p>
                  <p className="font-medium">{displayValue}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

