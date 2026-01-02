"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation"
import NextImage from "next/image";
import Link from "next/link";
import { getDirectusImageUrl } from "@/components/Images";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function VerifyStudentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [studentInfo, setStudentInfo] = useState<{ email?: string; firstName?: string; lastName?: string } | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      validateToken(token);
    } else {
      setLoadingToken(false);
      setError("Verification token is missing.");
    }
  }, [searchParams]);

  async function validateToken(token: string) {
    try {
      const res = await fetch(`/api/students/verify?token=${encodeURIComponent(token)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? "Invalid or expired verification token.");
        setTokenValid(false);
      } else {
        setTokenValid(true);
        setStudentInfo(data);
      }
    } catch {
      setError("Failed to validate token.");
      setTokenValid(false);
    } finally {
      setLoadingToken(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const token = searchParams.get("token");
    if (!token) {
      setError("Verification token is missing.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/students/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? "Failed to set password.");
      } else {
        // Redirect to login or dashboard
        router.push("/login?verified=true");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  if (loadingToken) {
    return (
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="flex flex-col gap-4 p-6 md:p-10">
          <div className="flex justify-center gap-2 md:justify-start">
            <Link href="/" className="flex items-center gap-2 font-medium hover:opacity-80 transition-opacity">
              VTK Career
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <Card className="w-full max-w-md">
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Validating verification token...</p>
              </CardContent>
            </Card>
          </div>
        </div>
        <div className="bg-muted relative hidden lg:block">
          <NextImage
            src={getDirectusImageUrl("875bb00d-d935-4e0b-b2fb-2dc9a9a2b12d") || "/placeholder.svg"}
            alt="VTK Career"
            fill
            className="object-cover dark:brightness-[0.2] dark:grayscale"
          />
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="flex flex-col gap-4 p-6 md:p-10">
          <div className="flex justify-center gap-2 md:justify-start">
            <Link href="/" className="flex items-center gap-2 font-medium hover:opacity-80 transition-opacity">
              VTK Career
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-red-600">Verification Failed</CardTitle>
                <CardDescription>There was an error verifying your email address.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{error || "Invalid or expired verification token."}</p>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/register">Back to Registration</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        <div className="bg-muted relative hidden lg:block">
          <NextImage
            src={getDirectusImageUrl("875bb00d-d935-4e0b-b2fb-2dc9a9a2b12d") || "/placeholder.svg"}
            alt="VTK Career"
            fill
            className="object-cover dark:brightness-[0.2] dark:grayscale"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium hover:opacity-80 transition-opacity">
            VTK Career
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <form className={"flex flex-col gap-6"} onSubmit={onSubmit}>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Set Your Password</h1>
                <p className="text-muted-foreground text-sm text-balance">
                  {studentInfo?.firstName ? `Welcome ${studentInfo.firstName}! ` : ""}
                  Create a password to complete your registration.
                </p>
              </div>
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    required 
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    required 
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Setting password…" : "Complete Registration"}
                </Button>
                {error && (
                  <p className="text-center text-sm text-red-600" role="alert">
                    {error}
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <NextImage
          src={getDirectusImageUrl("875bb00d-d935-4e0b-b2fb-2dc9a9a2b12d") || "/placeholder.svg"}
          alt="VTK Career"
          fill
          className="object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}

export default function VerifyStudentPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    }>
      <VerifyStudentContent />
    </Suspense>
  );
}

