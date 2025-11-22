"use client"

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import NextImage from "next/image";
import { getDirectusImageUrl } from "@/components/Images";
import { validatePageImageDimensions } from "@/lib/utils/image-validation";
import type { Company, Master } from "@/lib/schema";

type CompanyFormData = {
  id: string;
  name?: string;
  logo?: string | null;
  page_image?: string | null;
  website?: string;
  short_description?: string;
  long_description?: string;
  location?: string;
  VAT?: string | null;
  address_street?: string | null;
  address_number?: string | null;
  address_zip?: string | null;
  address_city?: string | null;
  address_country?: string | null;
  category?: Array<{ master_id?: { id: string } } | { id: string } | string>;
};

function CompanySetupForm({ token, company, masters, onComplete }: {
  token: string;
  company: CompanyFormData;
  masters: Master[];
  onComplete: () => void;
}) {
  const [formData, setFormData] = useState({
    name: company?.name || "",
    website: company?.website || "",
    location: company?.location || "",
    short_description: company?.short_description || "",
    long_description: company?.long_description || "",
    VAT: company?.VAT || "",
    address_street: company?.address_street || "",
    address_number: company?.address_number || "",
    address_zip: company?.address_zip || "",
    address_city: company?.address_city || "",
    address_country: company?.address_country || "",
  });
  
  const [selectedMasters, setSelectedMasters] = useState<string[]>(() => {
    if (company?.category && Array.isArray(company.category)) {
      return company.category.map((c: any) => {
        if (typeof c === 'string') return c;
        if (c.master_id?.id) return c.master_id.id;
        if (c.id) return c.id;
        return null;
      }).filter(Boolean);
    }
    return [];
  });
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(() => {
    if (company?.logo) {
      const url = getDirectusImageUrl(company.logo);
      return url || null;
    }
    return null;
  });
  const [pageImageFile, setPageImageFile] = useState<File | null>(null);
  const [pageImagePreview, setPageImagePreview] = useState<string | null>(() => {
    if (company?.page_image) {
      const url = getDirectusImageUrl(company.page_image);
      return url || null;
    }
    return null;
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  
  // Scroll to error when it appears
  useEffect(() => {
    if (error && errorRef.current) {
      setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [error]);
  
  const [shortDescriptionText, setShortDescriptionText] = useState<string>(
    company?.short_description ? htmlToPlainText(company.short_description) : ""
  );
  const [longDescriptionText, setLongDescriptionText] = useState<string>(
    company?.long_description ? htmlToPlainText(company.long_description) : ""
  );

  function htmlToPlainText(html: string | undefined): string {
    if (!html) return "";
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  }

  function plainTextToHtml(text: string): string {
    if (!text || !text.trim()) return "";
    const paragraphs = text.split(/\n\n+/);
    const htmlParagraphs = paragraphs
      .map((paragraph) => {
        const trimmed = paragraph.trim();
        if (!trimmed) return null;
        const lines = trimmed.split(/\n/).map((line) => {
          return line.trim()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
        });
        const nonEmptyLines = lines.filter((line) => line.length > 0);
        if (nonEmptyLines.length === 0) return null;
        const content = nonEmptyLines.length > 1 ? nonEmptyLines.join("<br>") : nonEmptyLines[0];
        return `<p>${content}</p>`;
      })
      .filter((p): p is string => p !== null && p.length > 0);
    return htmlParagraphs.length > 0 ? htmlParagraphs.join("") : "";
  }

  function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  const SHORT_DESC_WORD_LIMIT = 30;
  const LONG_DESC_WORD_LIMIT = 200;
  const MAX_LOGO_SIZE = 1 * 1024 * 1024; // 1 MB
  const MAX_PAGE_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== "image/png") {
      setError("Logo must be a PNG image file.");
      return;
    }
    
    if (file.size > MAX_LOGO_SIZE) {
      setError(`Logo file is too large. Maximum size is ${formatFileSize(MAX_LOGO_SIZE)}.`);
      return;
    }
    
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
    setLogoFile(file);
  }

  async function handlePageImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      setError("Page image must be an image file.");
      e.target.value = "";
      return;
    }
    
    if (file.size > MAX_PAGE_IMAGE_SIZE) {
      setError(`Page image file is too large. Maximum size is ${formatFileSize(MAX_PAGE_IMAGE_SIZE)}.`);
      e.target.value = "";
      return;
    }
    
    // Validate image dimensions
    const dimensionValidation = await validatePageImageDimensions(file);
    if (!dimensionValidation.valid) {
      setError(dimensionValidation.error || "Invalid image dimensions.");
      e.target.value = "";
      return;
    }
    
    const url = URL.createObjectURL(file);
    setPageImagePreview(url);
    setPageImageFile(file);
  }

  function toggleMaster(id: string) {
    setSelectedMasters((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validate required fields
    if (!formData.name.trim()) {
      setError("Company name is required");
      setLoading(false);
      return;
    }
    if (!formData.website.trim()) {
      setError("Website is required");
      setLoading(false);
      return;
    }
    if (!formData.location.trim()) {
      setError("Location is required");
      setLoading(false);
      return;
    }
    if (!shortDescriptionText.trim()) {
      setError("Short description is required");
      setLoading(false);
      return;
    }
    if (countWords(shortDescriptionText) > SHORT_DESC_WORD_LIMIT) {
      setError(`Short description exceeds the word limit of ${SHORT_DESC_WORD_LIMIT} words.`);
      setLoading(false);
      return;
    }
    if (countWords(longDescriptionText) > LONG_DESC_WORD_LIMIT) {
      setError(`Long description exceeds the word limit of ${LONG_DESC_WORD_LIMIT} words.`);
      setLoading(false);
      return;
    }
    // Logo is required - either existing or newly uploaded
    // The API will handle preserving existing logo if no new file is uploaded
    if (!logoFile && !company?.logo) {
      setError("Company logo is required. Please upload a logo.");
      setLoading(false);
      return;
    }
    if (selectedMasters.length === 0) {
      setError("At least one master category is required");
      setLoading(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("token", token);
      formDataToSend.append("companyId", company.id);
      formDataToSend.append("name", formData.name);
      formDataToSend.append("website", formData.website);
      formDataToSend.append("location", formData.location);
      formDataToSend.append("short_description", plainTextToHtml(shortDescriptionText));
      formDataToSend.append("long_description", plainTextToHtml(longDescriptionText));
      formDataToSend.append("VAT", formData.VAT);
      formDataToSend.append("address_street", formData.address_street);
      formDataToSend.append("address_number", formData.address_number);
      formDataToSend.append("address_zip", formData.address_zip);
      formDataToSend.append("address_city", formData.address_city);
      formDataToSend.append("address_country", formData.address_country);
      formDataToSend.append("selectedMasters", JSON.stringify(selectedMasters));
      
      if (logoFile) {
        formDataToSend.append("logo", logoFile);
      }
      if (pageImageFile) {
        formDataToSend.append("page_image", pageImageFile);
      }

      const res = await fetch("/api/invite/setup-company", {
        method: "POST",
        body: formDataToSend,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update company");
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Card className="rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl">Company Setup</CardTitle>
            <CardDescription>
              Please fill in your company information to complete the setup. All fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">

              {/* Company Information Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Company Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3 md:col-span-2">
                    <Label htmlFor="name">Company Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Company Logo (PNG) *</Label>
                    <div className="flex flex-col items-center gap-2">
                      {logoPreview ? (
                        <NextImage
                          src={logoPreview}
                          alt="Company Logo"
                          width={320}
                          height={180}
                          className="h-32 w-full max-w-sm object-contain rounded-md"
                        />
                      ) : (
                        <div className="h-32 w-full max-w-sm flex items-center justify-center rounded-md bg-gray-100 text-gray-500 text-sm">
                          No logo
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById("hidden-logo-input")?.click()}
                        >
                          {logoPreview ? "Change Logo" : "Upload Logo"}
                        </Button>
                        {logoPreview && company?.logo && !logoFile && (
                          <span className="text-xs text-gray-500 self-center">
                            (Existing logo - upload new to change)
                          </span>
                        )}
                      </div>
                    </div>
                    <input
                      id="hidden-logo-input"
                      type="file"
                      accept=".png"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    {company?.logo && !logoFile && (
                      <p className="text-xs text-gray-600">
                        Current logo will be kept. Upload a new PNG file to replace it.
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label>Page Background Image</Label>
                    <div className="flex flex-col items-center gap-2">
                      {pageImagePreview ? (
                        <NextImage
                          src={pageImagePreview}
                          alt="Page Background"
                          width={320}
                          height={180}
                          className="h-32 w-full max-w-sm object-cover rounded-md"
                        />
                      ) : (
                        <div className="h-32 w-full max-w-sm flex items-center justify-center rounded-md bg-gray-100 text-gray-500 text-sm">
                          No background image
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById("hidden-page-image-input")?.click()}
                      >
                        {pageImagePreview ? "Change Image" : "Upload Image"}
                      </Button>
                    </div>
                    <input
                      id="hidden-page-image-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePageImageUpload}
                    />
                  </div>

                  <div className="space-y-3 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="short-description">Short Description *</Label>
                      <span className={`text-xs ${countWords(shortDescriptionText) > SHORT_DESC_WORD_LIMIT ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                        {countWords(shortDescriptionText)} / {SHORT_DESC_WORD_LIMIT} words
                      </span>
                    </div>
                    <Textarea
                      id="short-description"
                      value={shortDescriptionText}
                      onChange={(e) => setShortDescriptionText(e.target.value)}
                      className="min-h-[80px] resize-y"
                      rows={4}
                      required
                    />
                  </div>

                  <div className="space-y-3 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="long-description">Long Description</Label>
                      <span className={`text-xs ${countWords(longDescriptionText) > LONG_DESC_WORD_LIMIT ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                        {countWords(longDescriptionText)} / {LONG_DESC_WORD_LIMIT} words
                      </span>
                    </div>
                    <Textarea
                      id="long-description"
                      value={longDescriptionText}
                      onChange={(e) => setLongDescriptionText(e.target.value)}
                      className="min-h-[120px] resize-y"
                      rows={6}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="website">Website *</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-3 md:col-span-2">
                    <Label>Interested Master Categories *</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-4">
                      {masters.map((opt) => {
                        const selected = selectedMasters.includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => toggleMaster(opt.id)}
                            className={`w-full py-2 rounded-lg border transition text-center cursor-pointer ${
                              selected
                                ? "bg-slate-700 text-white border-slate-700 opacity-100"
                                : "bg-white text-black border-gray-300 opacity-40"
                            } hover:opacity-90`}
                          >
                            {opt.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Billing Information Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Billing Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="address-street">Street</Label>
                    <Input
                      id="address-street"
                      value={formData.address_street}
                      onChange={(e) => setFormData({ ...formData, address_street: e.target.value })}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="address-number">Number</Label>
                    <Input
                      id="address-number"
                      value={formData.address_number}
                      onChange={(e) => setFormData({ ...formData, address_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="address-city">City</Label>
                    <Input
                      id="address-city"
                      value={formData.address_city}
                      onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="address-zip">ZIP Code</Label>
                    <Input
                      id="address-zip"
                      value={formData.address_zip}
                      onChange={(e) => setFormData({ ...formData, address_zip: e.target.value })}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="address-country">Country</Label>
                    <Input
                      id="address-country"
                      value={formData.address_country}
                      onChange={(e) => setFormData({ ...formData, address_country: e.target.value })}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="vat">VAT Number</Label>
                    <Input
                      id="vat"
                      value={formData.VAT}
                      onChange={(e) => setFormData({ ...formData, VAT: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? "Saving..." : "Continue to Password Setup"}
              </Button>
              {error && (
                <div ref={errorRef} className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm" role="alert">
                  {error}
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PasswordSetupForm({ token, onComplete }: { token: string; onComplete: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  
  // Scroll to error when it appears
  useEffect(() => {
    if (error && errorRef.current) {
      setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [error]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

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
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to set password");
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Set Up Your Account</CardTitle>
          <CardDescription>
          Create a secure password to complete your account setup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2"
                required
                minLength={8}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </div>

            <div className="mb-6">
              <Label htmlFor="confirm">Confirm Password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-2"
                required
                minLength={8}
                placeholder="Confirm your password"
                autoComplete="new-password"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? "Setting up account..." : "Complete Setup"}
            </Button>
            {error && (
              <p ref={errorRef} className="text-center text-sm text-red-600 mt-4" role="alert">
                {error}
              </p>
            )}
      </form>
        </CardContent>
      </Card>
    </div>
  );
}

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyFormData | null>(null);
  const [masters, setMasters] = useState<Master[]>([]);
  const [step, setStep] = useState<"loading" | "company-setup" | "password-setup" | "complete">("loading");
  const errorRef = useRef<HTMLParagraphElement>(null);
  
  // Scroll to error when it appears
  useEffect(() => {
    if (error && errorRef.current) {
      setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [error]);

  useEffect(() => {
    const urlToken = searchParams.get("token");
    if (!urlToken) {
      setError("Invalid or missing invitation token. Please check your invitation email.");
      setLoading(false);
      return;
    }

    setToken(urlToken);
    loadInviteData(urlToken);
  }, [searchParams]);

  async function loadInviteData(token: string) {
    try {
      // Load masters
      const mastersRes = await fetch("/api/masters");
      if (mastersRes.ok) {
        const mastersData = await mastersRes.json();
        setMasters(mastersData);
      }

      // Validate token and get company info
      const res = await fetch(`/api/invite/validate?token=${encodeURIComponent(token)}`);
      const data = await res.json();

      console.log(data);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to validate invitation");
      }

      setCompany(data.company);
      
      console.log("[accept-invite] Company data:", {
        hasCompany: !!data.company,
        companyId: data.company?.id,
        companyStatus: data.company?.status,
        companyName: data.company?.name,
      });

      // Check if company needs setup
      // If company exists but status is not "published", show company setup
      // If company is null or status is "published", go directly to password setup
      // If company status is null/undefined (couldn't be fetched), assume it needs setup for safety
      if (data.company && data.company.id) {
        if (data.company.status === null || data.company.status === undefined || data.company.status !== "published") {
          console.log("[accept-invite] Company needs setup (status:", data.company.status, "), showing company-setup form");
          setStep("company-setup");
        } else {
          console.log("[accept-invite] Company is already published, skipping to password setup");
          setStep("password-setup");
        }
      } else {
        console.warn("[accept-invite] No company found for user, skipping to password setup");
        setStep("password-setup");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  function handleCompanySetupComplete() {
    setStep("password-setup");
  }

  function handlePasswordSetupComplete() {
    setStep("complete");
    window.location.href = "/login?registered=true";
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <p className="text-gray-600">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <p ref={errorRef} className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <p className="text-red-500">Invalid invitation link. Please contact support.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "company-setup") {
    if (!company) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <Card className="w-full max-w-md">
            <CardContent className="py-8 text-center">
              <p className="text-red-500">Company information not found. Please contact support.</p>
            </CardContent>
          </Card>
        </div>
      );
    }
    return (
      <CompanySetupForm
        token={token}
        company={company}
        masters={masters}
        onComplete={handleCompanySetupComplete}
      />
    );
  }

  if (step === "password-setup") {
    return <PasswordSetupForm token={token} onComplete={handlePasswordSetupComplete} />;
  }

  return null;
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <p className="text-gray-600">Please wait while we load your invitation.</p>
          </CardContent>
        </Card>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
