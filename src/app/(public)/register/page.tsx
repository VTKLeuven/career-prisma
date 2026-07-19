"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react";
import { useRouter } from "next/navigation"
import NextImage from "next/image";
import Link from "next/link";
import { getFileUrl } from "@/components/Images";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UNIVERSITIES } from "@/lib/universities";

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [universityStatus, setUniversityStatus] = useState<string>("");
  const [university, setUniversity] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string>("");
  const router = useRouter()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!firstName || !lastName || !email || !university) {
      setError("First name, last name, email, and university are required.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/students/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          university_status: universityStatus || null,
          university: university || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? "Registration failed.");
      } else {
        // Show success message
        setRegisteredEmail(email);
        setSuccess(true);
        // Clear form
        setFirstName("");
        setLastName("");
        setEmail("");
        setUniversityStatus("");
        setUniversity("");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
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
            <form className={"flex flex-col gap-6"} onSubmit={onSubmit} autoComplete="on">
              {/* Hidden inputs ensure non-native selects still exist as form fields for autofill/bridge scripts */}
              <input type="hidden" name="university" value={university} readOnly />
              <input type="hidden" name="university_status" value={universityStatus} readOnly />
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Register as Student</h1>
                <p className="text-muted-foreground text-sm text-balance">
                  Create an account if you're not a KU Leuven student
                </p>
              </div>
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="first_name"
                    type="text"
                    placeholder="John"
                    required
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="last_name"
                    type="text"
                    placeholder="Doe"
                    required
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="john.doe@example.com"
                    required
                    autoComplete="email"
                    inputMode="email"
                    autoCapitalize="none"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="university">University</Label>
                  <Select value={university} onValueChange={setUniversity} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your university" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIVERSITIES.map((uni) => (
                        <SelectItem key={uni} value={uni}>
                          {uni}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="universityStatus">University Status (Optional)</Label>
                  <Select value={universityStatus} onValueChange={setUniversityStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="alumni">Alumni</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={loading || success}>
                  {loading ? "Registering…" : success ? "Registration Successful!" : "Register"}
                </Button>
                {error && (
                  <p className="text-center text-sm text-red-600" role="alert">
                    {error}
                  </p>
                )}
                {success && (
                  <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                    <p className="text-sm font-medium mb-2">Registration successful!</p>
                    <p className="text-sm">
                      We've sent a verification email to <strong>{registeredEmail}</strong>.
                      Please check your inbox and click the link to verify your email and set your password.
                    </p>
                  </div>
                )}
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/student-login" className="text-primary hover:underline">
                    Login
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <NextImage
          src={getFileUrl("875bb00d-d935-4e0b-b2fb-2dc9a9a2b12d") || "/placeholder.svg"}
          alt="VTK Career"
          fill
          className="object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}



