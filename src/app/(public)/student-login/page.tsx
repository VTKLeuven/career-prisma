"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation"
import NextImage from "next/image";
import Link from "next/link";
import { getDirectusImageUrl } from "@/components/Images";

export default function StudentLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState<string | null>(null);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleOAuthLogin = () => {
    const redirectTo = searchParams.get("redirectTo") || "/";
    window.location.href = `/api/auth/oauth/initiate?redirect_to=${encodeURIComponent(redirectTo)}`;
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Ensure rememberMe is explicitly a boolean
      const rememberMeValue = Boolean(rememberMe);
      
      const res = await fetch("/api/students/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe: rememberMeValue }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? "Login failed.");
      } else {
        router.refresh()
        router.replace("/")
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotPasswordLoading(true);
    setForgotPasswordError(null);
    setForgotPasswordSuccess(false);

    const emailToUse = forgotPasswordEmail || email;
    
    if (!emailToUse) {
      setForgotPasswordError("Please enter your email address.");
      setForgotPasswordLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToUse }),
      });

      const data = await res.json();

      if (!res.ok) {
        setForgotPasswordError(data?.error ?? "Failed to send password reset email.");
      } else {
        setForgotPasswordSuccess(true);
        setForgotPasswordEmail("");
      }
    } catch {
      setForgotPasswordError("Network error. Please try again.");
    } finally {
      setForgotPasswordLoading(false);
    }
  }

  function handleForgotPasswordOpenChange(open: boolean) {
    setForgotPasswordOpen(open);
    if (!open) {
      // Reset state when dialog closes
      setForgotPasswordError(null);
      setForgotPasswordSuccess(false);
      setForgotPasswordEmail("");
    } else {
      // Pre-fill email if available
      setForgotPasswordEmail(email);
    }
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
            <div className="flex flex-col items-center gap-2 text-center mb-6">
              <h1 className="text-2xl font-bold">Student Login</h1>
              <p className="text-muted-foreground text-sm text-balance">
                Login with your KU Leuven account or use email
              </p>
            </div>

            {/* Primary: OAuth Login */}
            <Button
              type="button"
              className="w-full bg-vtk-blue hover:bg-vtk-blueDark mb-6 cursor-pointer"
              onClick={handleOAuthLogin}
            >
              Login with KU Leuven Authenticator
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or login with email
                </span>
              </div>
            </div>

            {/* Secondary: Email/Password Login */}
            <form className={"flex flex-col gap-6"} onSubmit={onSubmit}>
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="m@example.com" required onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      onClick={() => setForgotPasswordOpen(true)}
                      className="text-sm text-primary hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input id="password" type="password" required onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => {
                      setRememberMe(checked === true);
                    }}
                  />
                  <Label
                    htmlFor="rememberMe"
                    className="text-sm font-normal cursor-pointer"
                    onClick={() => setRememberMe(!rememberMe)}
                  >
                    Remember me
                  </Label>
                </div>
                <Button type="submit" variant="outline" className="w-full cursor-pointer" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in with email"}
                </Button>
                {error && (
                  <p className="text-center text-sm text-red-600" role="alert">
                    {error}
                  </p>
                )}
              </div>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Don't have an account?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Register here
              </Link>
            </p>
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

      {/* Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onOpenChange={handleForgotPasswordOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          
          {forgotPasswordSuccess ? (
            <div className="py-4">
              <p className="text-sm text-green-600 mb-4">
                If an account with that email exists, a password reset link has been sent. Please check your email.
              </p>
              <DialogFooter>
                <Button
                  type="button"
                  onClick={() => setForgotPasswordOpen(false)}
                  className="cursor-pointer"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="grid gap-3">
                <Label htmlFor="forgot-password-email">Email</Label>
                <Input
                  id="forgot-password-email"
                  type="email"
                  placeholder="m@example.com"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  required
                />
              </div>
              {forgotPasswordError && (
                <p className="text-sm text-red-600" role="alert">
                  {forgotPasswordError}
                </p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForgotPasswordOpen(false)}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={forgotPasswordLoading}
                  className="cursor-pointer"
                >
                  {forgotPasswordLoading ? "Sending…" : "Send Reset Link"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

