"use client"

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestingToken, setRequestingToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // Check for token or email in URL
    const urlToken = searchParams.get("token");
    const urlEmail = searchParams.get("email");

    if (urlToken) {
      setToken(urlToken);
    } else if (urlEmail) {
      setEmail(urlEmail);
      // Don't automatically request - let user click button to request token
    } else {
      setError("Invalid or missing invitation link.");
    }
  }, [searchParams]);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const requestPasswordReset = async (userEmail: string) => {
    setRequestingToken(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Request password reset token from Directus
      const res = await fetch(`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/auth/password/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.errors?.[0]?.message || "Failed to request password reset");
      }

      // Success - Directus will send an email with the token
      setSuccessMessage("Password setup link has been sent to your email. Please check your inbox and click the link to set your password.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request password reset");
    } finally {
      setRequestingToken(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Please check your email for the password reset token and use the link provided.");
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/auth/password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.errors?.[0]?.message || "Failed to set password");
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
        <h1 className="text-2xl font-semibold mb-2">Set Your Password</h1>
        <p className="text-gray-600 text-sm mb-6">
          {email ? `Setting up account for ${email}` : "Create a password for your account"}
        </p>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {successMessage}
          </div>
        )}

        {requestingToken && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-4 text-sm">
            Sending password setup link...
          </div>
        )}

        {token && (
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
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? "Setting password..." : "Set Password"}
            </button>
          </>
        )}

        {!token && email && (
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Click the button below to receive a password setup link via email.
            </p>
            <button
              type="button"
              onClick={() => requestPasswordReset(email)}
              disabled={requestingToken}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium mb-2"
            >
              {requestingToken ? "Sending..." : "Send Password Setup Link"}
            </button>
          </div>
        )}
        
        {!token && !email && (
          <div className="text-center">
            <p className="text-red-500">Invalid invitation link. Please contact support.</p>
          </div>
        )}
      </form>
    </div>
  );
}
