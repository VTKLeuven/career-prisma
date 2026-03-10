"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Save, Star } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getScanningDisplayValues, hasScanningColumns } from "@/lib/utils/scanning-columns";

type AttendantInfo = {
  id: string;
  data: Record<string, unknown>;
  submitted_at: string;
  form_version_id: {
    form_id: {
      name: string;
    };
    metadata?: {
      scanning_columns?: {
        university?: string;
        faculty?: string;
        master?: string;
        year_of_study?: string;
      };
      [key: string]: unknown;
    };
  };
  student_id?: {
    first_name: string | null;
    last_name: string | null;
    full_name: string | null;
  } | null;
};

/** Extract display values for scan confirmation. Uses scanning_columns when configured, else fallback to hardcoded fields. */
function getScanDisplayInfo(attendant: AttendantInfo) {
  const data = attendant.data;
  const scanningColumns = attendant.form_version_id?.metadata?.scanning_columns;
  const useScanningCols = hasScanningColumns(scanningColumns);

  // Student name: from student who filled the form (_student_full_name or student_id relation)
  let name = "";
  const metaName = data._student_full_name;
  if (typeof metaName === "string" && metaName.trim()) {
    name = metaName.trim();
  } else if (attendant.student_id) {
    const s = attendant.student_id;
    if (s.full_name && String(s.full_name).trim()) {
      name = String(s.full_name).trim();
    } else {
      const first = (s.first_name ?? "").trim();
      const last = (s.last_name ?? "").trim();
      name = `${first} ${last}`.trim();
    }
  }
  if (!name) {
    const first = (data.firstname as string) || (data.name as string) || "";
    const last = (data.lastname as string) || (data.surname as string) || "";
    name = `${first} ${last}`.trim() || "Unknown";
  }

  let yearOfStudy = "";
  let studyField = "";

  if (useScanningCols && scanningColumns) {
    const scanValues = getScanningDisplayValues(data, scanningColumns);
    yearOfStudy = scanValues.yearOfStudy;
    const parts = [scanValues.university, scanValues.faculty, scanValues.master].filter(Boolean);
    studyField = parts.join(" – ");
  } else {
    // Fallback to hardcoded fields
    const yearKeys = ["year_of_study", "year", "academic_year", "study_year", "_student_year"];
    for (const k of yearKeys) {
      const v = data[k];
      if (v != null && String(v).trim()) {
        yearOfStudy = String(v).trim();
        break;
      }
    }

    const extractOne = (val: unknown): string | null => {
      if (val == null) return null;
      if (typeof val === "string" && val.trim()) return val.trim();
      if (typeof val === "object" && val !== null && "name" in (val as object))
        return String((val as { name: string }).name).trim() || null;
      if (typeof val === "object" && val !== null) {
        const o = val as Record<string, unknown>;
        const v = o.name ?? o.label ?? o.value ?? o.id;
        if (v != null && String(v).trim()) return String(v).trim();
      }
      return null;
    };
    const studyFieldVal = data.study_field;
    if (studyFieldVal != null) {
      if (Array.isArray(studyFieldVal)) {
        const first = studyFieldVal.map(extractOne).find(Boolean);
        if (first) studyField = first;
      } else {
        const s = extractOne(studyFieldVal);
        if (s) studyField = s;
      }
    }
  }

  return { name, yearOfStudy, studyField };
}

type UserCheckResponse = {
  companyRep: null | {
    authenticated: boolean;
    company: null | { id: string };
    admin: boolean;
    name: string;
    email: string;
  };
  student: null | {
    authenticated: boolean;
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
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
  const [scanId, setScanId] = useState<string | null>(null);
  const [isCompanyRep, setIsCompanyRep] = useState(false);
  const [isUnauthenticated, setIsUnauthenticated] = useState(false);

  const [liked, setLiked] = useState(false);
  const [comment, setComment] = useState<string>("");
  const [initialFeedback, setInitialFeedback] = useState<{ liked: boolean; comment: string } | null>(null);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const doScan = React.useCallback(async (targetUuid: string) => {
    setScanning(true);
    try {
      const scanResponse = await fetch(`/api/attendant/${targetUuid}/scan`, {
        method: "POST",
      });
      if (scanResponse.ok) {
        const scanData = (await scanResponse.json().catch(() => ({}))) as { scanId?: unknown };
        if (typeof scanData?.scanId === "string" && scanData.scanId) {
          setScanId(scanData.scanId);
        }
        setScanned(true);
        return true;
      }
    } catch (scanErr) {
      console.error("Error scanning attendant:", scanErr);
    } finally {
      setScanning(false);
    }
    return false;
  }, []);

  useEffect(() => {
    if (!scanId) return;

    let isMounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/scans/${encodeURIComponent(scanId)}`);
        if (!res.ok) return;
        const data = (await res.json().catch(() => ({}))) as { liked?: unknown; comment?: unknown };
        const nextLiked = data?.liked === true;
        const nextComment = typeof data?.comment === "string" ? data.comment : "";

        if (!isMounted) return;
        setLiked(nextLiked);
        setComment(nextComment);
        setInitialFeedback({ liked: nextLiked, comment: nextComment });
      } catch {
        // Best-effort: keep defaults
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [scanId]);

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
            const userData = (await userCheckResponse.json()) as UserCheckResponse;
            const rep = userData?.companyRep;
            const repCompanyId = rep?.company?.id;

            // If authenticated company rep, allow scan + feedback (even if already scanned)
            if (rep?.authenticated === true && typeof repCompanyId === "string" && repCompanyId) {
              setIsCompanyRep(true);
              setIsUnauthenticated(false);
              // Auto-scan once (best-effort)
              if (!scanned) {
                await doScan(uuid);
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
  }, [uuid, scanned, doScan]);

  const saveFeedback = async () => {
    if (!scanId) return;
    setSavingFeedback(true);
    setFeedbackError(null);
    try {
      const payload: { liked: boolean; comment: string } = {
        liked,
        comment,
      };

      const res = await fetch(`/api/scans/${encodeURIComponent(scanId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Failed to save feedback (${res.status})`);
      }
      setInitialFeedback({ liked, comment });
      setShowConfirmation(true);
    } catch (e) {
      setFeedbackError(e instanceof Error ? e.message : "Failed to save feedback");
    } finally {
      setSavingFeedback(false);
    }
  };

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
              <Button onClick={() => router.push(`/login?redirectTo=${encodeURIComponent(`/attendant/${uuid}`)}`)}>
                Go to company login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showConfirmation) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
              <p className="text-muted-foreground mb-4">
                Your feedback has been saved successfully.
              </p>
              <Button onClick={() => router.push("/")}>Go Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const scanInfo = getScanDisplayInfo(attendant);

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Attendant Information</CardTitle>
            {isCompanyRep && scanned && scanId && (
              <button
                type="button"
                onClick={() => setLiked((prev) => !prev)}
                disabled={savingFeedback}
                className="p-2 rounded-full hover:bg-muted transition-colors disabled:opacity-50"
                aria-label={liked ? "Remove star" : "Add star"}
              >
                <Star
                  className={`h-5 w-5 ${liked ? "fill-amber-300 text-amber-400" : "text-muted-foreground"}`}
                />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCompanyRep && !scanned && (
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="text-sm">
                <div className="font-medium">Ready to scan</div>
                <div className="text-muted-foreground">Scan this attendee to add them to your list.</div>
              </div>
              <Button disabled={scanning} onClick={() => void (async () => doScan(uuid))()}>
                {scanning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  "Scan now"
                )}
              </Button>
            </div>
          )}

          {isCompanyRep && scanned && scanId && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span className="font-medium">Scanned</span>
              </div>

              <div>
                <p className="text-lg font-semibold">
                  {scanInfo.name}
                  {scanInfo.yearOfStudy ? ` – ${scanInfo.yearOfStudy}` : ""}
                </p>
                {scanInfo.studyField ? (
                  <p className="text-sm text-muted-foreground mt-0.5">{scanInfo.studyField}</p>
                ) : null}
              </div>

              {feedbackError && (
                <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                  {feedbackError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="comment">Comment</Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Write a short note..."
                  disabled={savingFeedback}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  disabled={savingFeedback}
                  onClick={() => void saveFeedback()}
                >
                  {savingFeedback ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save feedback
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {!isCompanyRep || !scanned ? (
            <>
              {Object.keys(attendant.data).some((k) => !k.startsWith("_")) && (
                <div className="border-t pt-4 space-y-3">
                  <h3 className="font-semibold">Details</h3>
                  {Object.entries(attendant.data).map(([key, value]) => {
                    if (key.startsWith("_")) return null;
                    const displayKey = key
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (str) => str.toUpperCase())
                      .trim();
                    let displayValue: React.ReactNode = String(value || "");
                    if (Array.isArray(value)) {
                      displayValue = value.join(", ");
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
              )}
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

