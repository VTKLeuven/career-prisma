"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    const redirectTo = searchParams.get("redirect_to") || "/";

    // Handle errors
    if (error) {
      console.error("OAuth error:", error, errorDescription);
      return;
    }

    // Automatically redirect on successful authentication
    router.push(redirectTo);
  }, [searchParams, router]);

  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const redirectTo = searchParams.get("redirect_to") || "/";

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Authentication Error</CardTitle>
            <CardDescription>There was an error during the OAuth authentication process.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Error Code:</p>
              <p className="text-sm text-muted-foreground font-mono">{error}</p>
            </div>
            {errorDescription && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Error Description:</p>
                <p className="text-sm text-muted-foreground">{errorDescription}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button asChild variant="outline" className="flex-1">
                <Link href="/login">Back to Login</Link>
              </Button>
              <Button onClick={() => router.push(redirectTo)} className="flex-1">
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Processing Authentication...</CardTitle>
          <CardDescription>
            Please wait while we complete your login.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Redirecting...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

