"use client"

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    // Check for token in URL
    const urlToken = searchParams.get("token");

    if (urlToken) {
      setToken(urlToken);
      setLoadingUser(false);
    } else {
      setError("Invalid or missing invitation token. Please check your invitation email.");
      setLoadingUser(false);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Invalid invitation token. Please check your invitation email.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      // Accept invite and set password via our secure API route
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to set password");
      }

      // ✅ Success — redirect to login
      window.location.href = "/login?registered=true";
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md"
      >
        <h1 className="text-2xl font-semibold mb-2">Set Up Your Account</h1>
        <p className="text-gray-600 text-sm mb-6">
          Create a secure password to complete your account setup
        </p>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {loadingUser ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading invitation...</p>
          </div>
        ) : token ? (
          <>
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                minLength={8}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </div>

            <div className="mb-6">
              <label className="block mb-2 text-sm font-medium">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                minLength={8}
                placeholder="Confirm your password"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? "Setting up account..." : "Complete Setup"}
            </button>
          </>
        ) : (
          <div className="text-center">
            <p className="text-red-500">Invalid invitation link. Please contact support.</p>
          </div>
        )}
      </form>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md">
          <h1 className="text-2xl font-semibold mb-2">Loading...</h1>
          <p className="text-gray-600 text-sm">Please wait while we load your invitation.</p>
        </div>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
