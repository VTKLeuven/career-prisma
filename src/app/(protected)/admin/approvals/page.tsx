"use client";

import * as React from "react";
import { fetchPendingApprovalRequestsAction, approveRepRequestAction } from "@/app/actions/companies";
import type { PendingApprovalRequest } from "@/lib/repos/users";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/providers/UserProvider";

export default function PendingApprovalsPage() {
  const { user } = useUser();
  if (!user?.admin) return <p>NO ACCESS</p>;

  return (
    <div className="flex flex-col gap-4">
      <PendingApprovalsSection />
    </div>
  );
}

function PendingApprovalsSection() {
  const { user } = useUser();
  const [pendingRequests, setPendingRequests] = React.useState<PendingApprovalRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [processing, setProcessing] = React.useState<string | null>(null);
  const [errorCount, setErrorCount] = React.useState(0);
  const [lastError, setLastError] = React.useState<string | null>(null);

  const shouldShow = user?.admin;
  const MAX_CONSECUTIVE_ERRORS = 3;
  const POLLING_INTERVAL = 10000; // 10 seconds
  const ERROR_BACKOFF_MULTIPLIER = 2;

  React.useEffect(() => {
    if (!shouldShow) {
      setLoading(false);
      return;
    }

    let alive = true;
    let consecutiveErrors = 0;
    let pollTimeout: NodeJS.Timeout | null = null;

    const fetchRequests = async () => {
      if (!alive) return;
      
      try {
        const requests = await fetchPendingApprovalRequestsAction();
        if (!alive) return;
        
        setPendingRequests(requests);
        setErrorCount(0);
        setLastError(null);
        consecutiveErrors = 0;
        
        // Schedule next fetch with normal polling interval
        if (alive) {
          pollTimeout = setTimeout(fetchRequests, POLLING_INTERVAL);
        }
      } catch (error) {
        if (!alive) return;
        
        consecutiveErrors++;
        setErrorCount(consecutiveErrors);
        const errorMessage = error instanceof Error ? error.message : String(error);
        setLastError(errorMessage);
        
        console.error(`Failed to fetch pending approval requests (attempt ${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, error);
        
        // Stop polling after too many consecutive errors
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          console.error(`Stopped polling after ${MAX_CONSECUTIVE_ERRORS} consecutive errors. Please refresh the page to retry.`);
          return; // Don't schedule another fetch
        }
        
        // Exponential backoff: wait longer between retries after errors
        const backoffDelay = POLLING_INTERVAL * ERROR_BACKOFF_MULTIPLIER * consecutiveErrors;
        if (alive) {
          pollTimeout = setTimeout(fetchRequests, backoffDelay);
        }
      }
    };

    // Initial fetch
    fetchRequests().finally(() => {
      if (alive) setLoading(false);
    });

    return () => {
      alive = false;
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
    };
  }, [shouldShow]);

  const handleApprove = async (requestId: string) => {
    setProcessing(requestId);
    try {
      const result = await approveRepRequestAction(requestId, "approve");
      if (result.success) {
        // Remove from list
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
        // Refresh after a short delay to allow backend processing
        setTimeout(() => {
          fetchPendingApprovalRequestsAction()
            .then((requests) => setPendingRequests(requests))
            .catch(console.error);
        }, 1000);
      } else {
        alert(`Failed to approve: ${result.error}`);
      }
    } catch (error) {
      console.error("Error approving request:", error);
      alert("Failed to approve request");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessing(requestId);
    try {
      const result = await approveRepRequestAction(requestId, "reject");
      if (result.success) {
        // Remove from list
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      } else {
        alert(`Failed to reject: ${result.error}`);
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
      alert("Failed to reject request");
    } finally {
      setProcessing(null);
    }
  };

  if (!shouldShow) {
    return null;
  }

  const formatAddress = (company: PendingApprovalRequest["company"]) => {
    if (!company) return "N/A";
    const parts = [
      company.address_street && company.address_number
        ? `${company.address_street} ${company.address_number}`.trim()
        : company.address_street || company.address_number || "",
      company.address_zip && company.address_city
        ? `${company.address_zip} ${company.address_city}`.trim()
        : company.address_zip || company.address_city || "",
      company.address_country || "",
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "N/A";
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">Pending Approvals</CardTitle>
          {pendingRequests.length > 0 && (
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 text-white text-sm font-bold">
              {pendingRequests.length}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : pendingRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending approval requests</p>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">Company Information</h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Name:</strong> {request.company?.name || "N/A"}</p>
                      <p><strong>VAT:</strong> {request.company?.VAT || "N/A"}</p>
                      <p><strong>Address:</strong> {formatAddress(request.company)}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">New User Information</h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Name:</strong> {request.first_name || ""} {request.last_name || ""}</p>
                      <p><strong>Email:</strong> {request.email}</p>
                      <p><strong>Phone:</strong> {request.tel || "N/A"}</p>
                      <p><strong>Function:</strong> {request.title || "N/A"}</p>
                      <p><strong>Requested:</strong> {formatDate(request.date_created)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReject(request.id)}
                    disabled={processing === request.id}
                  >
                    {processing === request.id ? "Processing..." : "Reject"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(request.id)}
                    disabled={processing === request.id}
                  >
                    {processing === request.id ? "Processing..." : "Approve"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

