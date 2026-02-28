"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export default function KuLeuvenLoginPage() {
  const searchParams = useSearchParams();

  const redirectTo = searchParams.get("redirectTo") || "/";

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>KU Leuven SSO (Hidden)</CardTitle>
          <CardDescription>
            Internal-only page for testing KU Leuven OIDC login. Not linked from the UI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            className="w-full cursor-pointer"
            onClick={() => signIn("kuleuven", { callbackUrl: redirectTo })}
          >
            Login with KU Leuven
          </Button>
          <p className="text-sm text-muted-foreground">
            Redirect after login: <span className="font-mono">{redirectTo}</span>
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/student-login">Back to student login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

