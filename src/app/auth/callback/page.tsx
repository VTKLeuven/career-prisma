"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

interface TokenInfo {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [decodedData, setDecodedData] = useState<{
    userInfo?: unknown;
    tokenInfo?: TokenInfo;
  } | null>(null);

  useEffect(() => {
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    const userInfoBase64 = searchParams.get("user_info");
    const tokenInfoBase64 = searchParams.get("token_info");
    const redirectTo = searchParams.get("redirect_to") || "/";

    // Handle errors
    if (error) {
      console.error("OAuth error:", error, errorDescription);
      return;
    }

    // Decode and display user info for debugging
    if (userInfoBase64 || tokenInfoBase64) {
      try {
        // Convert base64url to base64 (replace _ with / and - with +, add padding)
        const base64ToBase64url = (str: string) => {
          let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
          while (base64.length % 4) {
            base64 += '=';
          }
          return base64;
        };

        const userInfo = userInfoBase64
          ? JSON.parse(atob(base64ToBase64url(userInfoBase64)))
          : undefined;
        const tokenInfo = tokenInfoBase64
          ? JSON.parse(atob(base64ToBase64url(tokenInfoBase64)))
          : undefined;

        setDecodedData({ userInfo, tokenInfo });

        // Log to console for easier inspection
        console.log("OAuth User Info:", userInfo);
        console.log("OAuth Token Info:", tokenInfo);
      } catch (parseError) {
        console.error("Failed to decode OAuth data:", parseError);
      }
    }
  }, [searchParams]);

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
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>OAuth Authentication Successful</CardTitle>
          <CardDescription>
            Below is the information received from the OAuth provider. This is for debugging purposes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {decodedData ? (
            <>
              {decodedData.userInfo && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">User Information</h3>
                  <div className="rounded-lg border bg-muted p-4">
                    <pre className="text-xs overflow-auto max-h-96">
                      {JSON.stringify(decodedData.userInfo, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {decodedData.tokenInfo && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Token Information</h3>
                  <div className="rounded-lg border bg-muted p-4">
                    <pre className="text-xs overflow-auto max-h-96">
                      {JSON.stringify(
                        {
                          ...decodedData.tokenInfo,
                          // Mask the actual token for security
                          access_token: decodedData.tokenInfo?.access_token
                            ? `${decodedData.tokenInfo.access_token.substring(0, 20)}...`
                            : undefined,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/login">Back to Login</Link>
                </Button>
                <Button onClick={() => router.push(redirectTo)} className="flex-1">
                  Continue to Application
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Processing authentication...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

