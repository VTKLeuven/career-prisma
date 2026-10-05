"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { IconCheck, IconRefresh, IconAlertTriangle } from "@tabler/icons-react";
import Link from "next/link";
import type { Company, Master } from "@/lib/schema";
import { updateCompanyAction, uploadCompanyLogo } from "@/app/actions/companies";
import { getFileUrl } from "@/components/Images";
import NextImage from "next/image";
import { Textarea } from "@/components/ui/textarea";
import { validatePageImageDimensions, validateExistingPageImage } from "@/lib/utils/image-validation";
import { hasCompanyPageAccess } from "@/lib/utils/company-access";
import { slugifyCompanyName } from "@/lib/utils/slugify";
import { toast } from "sonner";
import { htmlToPlainText, plainTextToHtml } from "@/lib/utils/description-text";
import { useSettingsCompany } from "../settings-company";

// --- Helpers ---
function isFileLike(value: unknown): value is File {
  return typeof value === "object" && value !== null && "name" in value;
}

function fileUrlOf(value: unknown): string | null {
  return typeof value === "string" ? getFileUrl(value) ?? null : null;
}

/** The master ids of company.category, whether stored as ids, masters or { master_id } junctions. */
function categoryIdsOf(company: Company | null): string[] {
  const ids: string[] = [];
  if (!company || !Array.isArray(company.category)) return ids;
  for (const c of company.category) {
    if (typeof c === "string") {
      ids.push(c);
    } else if (c && typeof c === "object") {
      if ("master_id" in c) {
        const masterId = (c as { master_id: Master | string | null }).master_id;
        if (typeof masterId === "string") ids.push(masterId);
        else if (masterId && typeof masterId === "object" && "id" in masterId) ids.push(masterId.id);
      } else if ("id" in c && typeof (c as { id: unknown }).id === "string") {
        ids.push((c as { id: string }).id);
      }
    }
  }
  return ids;
}

// --- Main Form ---
/**
 * The company information tab. Opens with the company the settings layout
 * loaded on the server; the masters come from the page.
 */
export function CompanyInformationForm({ masters }: { masters: Master[] }) {
  const { company: loadedCompany, setCompany: setSettingsCompany } = useSettingsCompany();
  const [company, setCompany] = useState<Company | null>(loadedCompany);
  const [selectedMasters, setSelectedMasters] = useState<string[]>(() => categoryIdsOf(loadedCompany));
  const [logoPreview, setLogoPreview] = useState<string | null>(() => fileUrlOf(loadedCompany?.logo));
  const [initialPageImageUrl] = useState(() => fileUrlOf(loadedCompany?.page_image));
  const [pageImagePreview, setPageImagePreview] = useState<string | null>(initialPageImageUrl);
  
  // Local state for textarea values (plain text) to preserve spaces
  const [shortDescriptionText, setShortDescriptionText] = useState<string>(() => htmlToPlainText(loadedCompany?.short_description));
  const [longDescriptionText, setLongDescriptionText] = useState<string>(() => htmlToPlainText(loadedCompany?.long_description));
  
  // File upload error states
  const [logoError, setLogoError] = useState<string | null>(null);
  const [pageImageError, setPageImageError] = useState<string | null>(null);
  const [pageImageValid, setPageImageValid] = useState<boolean | null>(null); // null = not checked, true = valid, false = invalid
  const pageImageErrorRef = useRef<HTMLParagraphElement>(null);
  const logoErrorRef = useRef<HTMLParagraphElement>(null);

  const [savedSnapshot, setSavedSnapshot] = useState<{
    company: Company;
    selectedMasters: string[];
  } | null>(() => (loadedCompany ? { company: loadedCompany, selectedMasters: categoryIdsOf(loadedCompany) } : null));
  
  // Word count limits
  const SHORT_DESC_WORD_LIMIT = 30;
  const LONG_DESC_WORD_LIMIT = 200;
  
  // File size limits (in bytes)
  const MAX_LOGO_SIZE = 1 * 1024 * 1024; // 1 MB - logos should be optimized
  const MAX_PAGE_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB - background images can be larger
  
  // Helper function to format file size
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
  
  // Helper function to count words
  function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  const emptyCompany: Company = {
    id: "",
    name: "New Company",
    logo: "",
    page_image: "",
    short_description: "",
    long_description: "",
    category: [],
    location: "City, Country",
    website: "https://example.com",
    VAT: "",
    address_street: "",
    address_number: "",
    address_zip: "",
    address_city: "",
    address_country: "",
    address: "",
  };

  const formCompany = company || emptyCompany;

  // The saved page image's dimensions are checked in the browser (it loads the image).
  useEffect(() => {
    if (!initialPageImageUrl) return;
    validateExistingPageImage(initialPageImageUrl)
      .then((result) => setPageImageValid(result.valid))
      .catch(() => setPageImageValid(false));
  }, [initialPageImageUrl]);

  // --- Update Form Field ---
  function updateField<K extends keyof Company>(field: K, value: Company[K]) {
    setCompany((prev) => (prev ? { ...prev, [field]: value } : { ...emptyCompany, [field]: value }));
  }

  // --- Logo Upload ---
  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setLogoError(null);
      return;
    }
    
    // Clear previous errors
    setLogoError(null);
    
    // Validate file type
    if (file.type !== "image/png") {
      setLogoError("Logo must be a PNG image file.");
      e.target.value = "";
      setTimeout(() => {
        logoErrorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return;
    }
    
    // Validate file size
    if (file.size > MAX_LOGO_SIZE) {
      setLogoError(`Logo file is too large. Maximum size is ${formatFileSize(MAX_LOGO_SIZE)}. Your file is ${formatFileSize(file.size)}.`);
      e.target.value = "";
      setTimeout(() => {
        logoErrorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return;
    }
    
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
    updateField("logo", file as unknown as string);
  }

  // --- Page Image Upload ---
  async function handlePageImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPageImageError(null);
      return;
    }
    
    // Clear previous errors
    setPageImageError(null);
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      setPageImageError("Page image must be an image file.");
      e.target.value = "";
      setTimeout(() => {
        pageImageErrorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return;
    }
    
    // Validate file size
    if (file.size > MAX_PAGE_IMAGE_SIZE) {
      setPageImageError(`Page image file is too large. Maximum size is ${formatFileSize(MAX_PAGE_IMAGE_SIZE)}. Your file is ${formatFileSize(file.size)}.`);
      e.target.value = "";
      setTimeout(() => {
        pageImageErrorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return;
    }
    
    // Validate image dimensions
    const dimensionValidation = await validatePageImageDimensions(file);
    if (!dimensionValidation.valid) {
      setPageImageError(dimensionValidation.error || "Invalid image dimensions.");
      setPageImageValid(false);
      e.target.value = "";
      // Scroll to error after state update
      setTimeout(() => {
        pageImageErrorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return;
    }
    
    const url = URL.createObjectURL(file);
    setPageImagePreview(url);
    setPageImageValid(true);
    updateField("page_image", file as unknown as string);
  }

  // --- Toggle Masters ---
  function toggleMaster(id: string) {
    setSelectedMasters((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // --- Dirty Check ---
  const isDirty = useMemo(() => {
    if (!company || !savedSnapshot) return false;
    
    // Compare text descriptions (convert saved HTML to text for comparison)
    const savedShortText = htmlToPlainText(savedSnapshot.company.short_description);
    const savedLongText = htmlToPlainText(savedSnapshot.company.long_description);
    
    const textChanged = 
      shortDescriptionText !== savedShortText || 
      longDescriptionText !== savedLongText;
    
    // Compare other fields
    const current = { ...company, category: selectedMasters };
    const saved = { ...savedSnapshot.company, category: savedSnapshot.selectedMasters };
    const otherChanged = JSON.stringify(current) !== JSON.stringify(saved);
    
    return textChanged || otherChanged;
  }, [company, selectedMasters, savedSnapshot, shortDescriptionText, longDescriptionText]);

  // --- Submit ---
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company) return;

    // Check word limits
    const shortWordCount = countWords(shortDescriptionText);
    const longWordCount = countWords(longDescriptionText);
    
    if (shortWordCount > SHORT_DESC_WORD_LIMIT) {
      toast.error(`Short description exceeds the word limit of ${SHORT_DESC_WORD_LIMIT} words. Current: ${shortWordCount} words.`);
      return;
    }
    
    if (longWordCount > LONG_DESC_WORD_LIMIT) {
      toast.error(`Long description exceeds the word limit of ${LONG_DESC_WORD_LIMIT} words. Current: ${longWordCount} words.`);
      return;
    }

    let logoId: string | undefined = undefined;
    let pageImageId: string | undefined = undefined;

    if (isFileLike(company.logo)) {
      const uploaded = await uploadCompanyLogo(company.logo);
      logoId = uploaded ?? undefined;
    } else if (typeof company.logo === "string") {
      logoId = company.logo;
    }

    if (isFileLike(company.page_image)) {
      const uploadedBg = await uploadCompanyLogo(company.page_image);
      pageImageId = uploadedBg ?? undefined;
    } else if (typeof company.page_image === "string") {
      pageImageId = company.page_image;
    }

    // Convert plain text to HTML before saving
    const shortDescriptionHtml = plainTextToHtml(shortDescriptionText);
    const longDescriptionHtml = plainTextToHtml(longDescriptionText);

    // Build payload - only include fields that are set
    // IMPORTANT: Only include string values, never File objects
    const payload: Partial<Company> = {
      name: company.name || "",
      category: masters.filter((m) => selectedMasters.includes(m.id)).map((m) => ({ master_id: m.id })),
      location: company.location || "",
      website: company.website || "",
      short_description: shortDescriptionHtml || "",
      long_description: longDescriptionHtml || "",
    };
    
    // Only include logo/page_image if they are string IDs (never File objects)
    if (logoId && typeof logoId === "string") {
      payload.logo = logoId;
    }
    
    if (pageImageId && typeof pageImageId === "string") {
      payload.page_image = pageImageId;
    }
    
    // Validate payload doesn't contain File objects (safety check)
    const payloadString = JSON.stringify(payload);
    if (payloadString.length > 8 * 1024 * 1024) { // 8MB warning
      console.warn("Payload is very large:", payloadString.length, "bytes");
    }

    try {
      const updated = await updateCompanyAction(company.id, payload);
      if (updated) {
        const persistedMasters = [...selectedMasters];
        setSavedSnapshot({
          company: updated,
          selectedMasters: persistedMasters,
        });
        const savedCompany = {
          ...updated,
          category: masters.filter((m) => persistedMasters.includes(m.id)),
        };
        setCompany(savedCompany);
        setSettingsCompany(savedCompany);
        setSelectedMasters(persistedMasters);
        setLogoPreview(
          typeof updated.logo === "string"
            ? getFileUrl(updated.logo) ?? null
            : null
        );
        const newPageImageUrl = typeof updated.page_image === "string"
          ? getFileUrl(updated.page_image) ?? null
          : null;
        setPageImagePreview(newPageImageUrl);
        
        // Validate new page image if it exists
        if (newPageImageUrl) {
          validateExistingPageImage(newPageImageUrl)
            .then((result) => {
              setPageImageValid(result.valid);
            })
            .catch(() => {
              setPageImageValid(false);
            });
        } else {
          setPageImageValid(null);
        }
        
        // Dispatch custom event to notify sidebar to refresh
        window.dispatchEvent(new CustomEvent('company-updated', { 
          detail: { companyId: company.id } 
        }));
        
        // Update saved snapshot text values
        setShortDescriptionText(htmlToPlainText(updated.short_description));
        setLongDescriptionText(htmlToPlainText(updated.long_description));
      }
    } catch (err) {
      console.error("Error updating company:", err);
      // Show user-friendly error message
      if (err instanceof Error) {
        if (err.message.includes("Body exceeded") || err.message.includes("413")) {
          toast.error(`The data you're trying to save is too large. Please reduce the size of your descriptions or contact support if this persists. Error: ${err.message}`);
        } else {
          toast.error(`Failed to save company information. Please try again. Error: ${err.message}`);
        }
      } else {
        toast.error("Failed to save company information. Please try again.");
      }
    }
  }

  // --- Reset ---
  function handleReset() {
    if (!savedSnapshot) return;
    setCompany({ ...savedSnapshot.company });
    setSelectedMasters([...savedSnapshot.selectedMasters]);
    setLogoPreview(typeof savedSnapshot.company.logo === "string" ? getFileUrl(savedSnapshot.company.logo) ?? null : null);
    setPageImagePreview(typeof savedSnapshot.company.page_image === "string" ? getFileUrl(savedSnapshot.company.page_image) ?? null : null);
    // Reset textarea values to saved HTML converted to text
    setShortDescriptionText(htmlToPlainText(savedSnapshot.company.short_description));
    setLongDescriptionText(htmlToPlainText(savedSnapshot.company.long_description));
    // Clear errors
    setLogoError(null);
    setPageImageError(null);
  }

  // --- Render ---
  return (
    <div className="w-full gap-4 flex flex-col">
      {/* Company Information Section */}
      <Card className="rounded-2xl shadow-md">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-xl">Company Information</CardTitle>
            <CardDescription>
              Provide general company details. This information will be visible on your profile and used for events.
            </CardDescription>
          </div>
          {company && (
            <Link
              href={hasCompanyPageAccess(company)
                ? `/company/${slugifyCompanyName(company.name)}`
                : "/dashboard/settings/information/request-page"
              }
            >
              <Button type="button" variant="outline" className="cursor-pointer">
                {hasCompanyPageAccess(company) ? "View Company Page" : "Request Company Page"}
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Company Name */}
              <div className="space-y-3">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  placeholder="Company Name"
                  value={formCompany.name ?? ""}
                  onChange={(e) => updateField("name", e.target.value)}
                />
              </div>

              {/* Empty space to keep grid layout */}
              <div></div>

              {/* Logo */}
              <div className="space-y-3">
                <Label>Company Logo (PNG)</Label>
                <div className="flex flex-col items-center gap-2">
                  {logoPreview ? (
                    <NextImage
                      src={logoPreview}
                      alt="Company Logo"
                      width={320}
                      height={180}
                      className="h-32 w-full max-w-sm object-contain rounded-md"
                    />
                  ) : formCompany.logo ? (
                    <NextImage
                      src={getFileUrl(formCompany.logo) ?? ""}
                      alt="Company Logo"
                      width={320}
                      height={180}
                      className="h-32 w-full max-w-sm object-contain rounded-md"
                    />
                  ) : (
                    <div className="h-32 w-full max-w-sm flex items-center justify-center rounded-md bg-gray-100 text-gray-500 text-sm whitespace-nowrap">
                      No logo
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() =>
                        document.getElementById("hidden-logo-input")?.click()
                      }
                    >
                      {logoPreview || formCompany.logo ? "Change Logo" : "Upload Logo"}
                    </Button>
                    {(logoPreview || formCompany.logo) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => {
                          setLogoPreview(null);
                          setLogoError(null);
                          updateField("logo", "");
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  {logoError && (
                    <p ref={logoErrorRef} className="text-xs text-red-600 text-center max-w-sm">
                      {logoError}
                    </p>
                  )}
                </div>
                <input
                  id="hidden-logo-input"
                  type="file"
                  accept=".png"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>

              {/* Page Background Image */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label>Page Background Image</Label>
                  {pageImageValid === false && (
                    <IconAlertTriangle className="h-5 w-5 text-red-600" title="Image dimensions are not suitable for use as a background" />
                  )}
                </div>
                <div className="flex flex-col items-center gap-2">
                  {pageImagePreview ? (
                    <NextImage
                      src={pageImagePreview}
                      alt="Page Background"
                      width={320}
                      height={180}
                      className="h-32 w-full max-w-sm object-cover rounded-md"
                    />
                  ) : formCompany.page_image ? (
                    <NextImage
                      src={getFileUrl(formCompany.page_image) ?? ""}
                      alt="Page Background"
                      width={320}
                      height={180}
                      className="h-32 w-full max-w-sm object-cover rounded-md"
                    />
                  ) : (
                    <div className="h-32 w-full max-w-sm flex items-center justify-center rounded-md bg-gray-100 text-gray-500 text-sm whitespace-nowrap">
                      No background image
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() =>
                        document.getElementById("hidden-page-image-input")?.click()
                      }
                    >
                      {pageImagePreview || formCompany.page_image ? "Change Image" : "Upload Image"}
                    </Button>
                    {(pageImagePreview || formCompany.page_image) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => {
                          setPageImagePreview(null);
                          setPageImageError(null);
                          updateField("page_image", "");
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  {pageImageError && (
                    <p ref={pageImageErrorRef} className="text-xs text-red-600 text-center max-w-sm">
                      {pageImageError}
                    </p>
                  )}
                </div>
                <input
                  id="hidden-page-image-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePageImageUpload}
                />
              </div>

              {/* Short Description */}
              <div className="space-y-3 md:col-span-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="short-description">Short Description</Label>
                  <span className={`text-xs ${countWords(shortDescriptionText) > SHORT_DESC_WORD_LIMIT ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                    {countWords(shortDescriptionText)} / {SHORT_DESC_WORD_LIMIT} words
                  </span>
                </div>
                <Textarea
                  id="short-description"
                  placeholder="Enter a brief description of your company..."
                  value={shortDescriptionText}
                  onChange={(e) => {
                    setShortDescriptionText(e.target.value);
                  }}
                  className="min-h-[80px] resize-y"
                  rows={4}
                />
                {countWords(shortDescriptionText) > SHORT_DESC_WORD_LIMIT && (
                  <p className="text-xs text-red-600">
                    Exceeds word limit by {countWords(shortDescriptionText) - SHORT_DESC_WORD_LIMIT} words
                  </p>
                )}
              </div>

              {/* Long Description */}
              <div className="space-y-3 md:col-span-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="long-description">Long Description</Label>
                  <span className={`text-xs ${countWords(longDescriptionText) > LONG_DESC_WORD_LIMIT ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                    {countWords(longDescriptionText)} / {LONG_DESC_WORD_LIMIT} words
                  </span>
                </div>
                <Textarea
                  id="long-description"
                  placeholder="Enter a more detailed description about your company, mission, and activities..."
                  value={longDescriptionText}
                  onChange={(e) => {
                    setLongDescriptionText(e.target.value);
                  }}
                  className="min-h-[120px] resize-y"
                  rows={6}
                />
                {countWords(longDescriptionText) > LONG_DESC_WORD_LIMIT && (
                  <p className="text-xs text-red-600">
                    Exceeds word limit by {countWords(longDescriptionText) - LONG_DESC_WORD_LIMIT} words
                  </p>
                )}
              </div>

              {/* Location */}
              <div className="space-y-3">
                <Label htmlFor="location">Location</Label>
                <Input
                  placeholder="City, Country"
                  value={formCompany.location ?? ""}
                  onChange={(e) => updateField("location", e.target.value)}
                />
              </div>

              {/* Website */}
              <div className="space-y-3">
                <Label htmlFor="website">Website</Label>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={formCompany.website ?? ""}
                  onChange={(e) => updateField("website", e.target.value)}
                />
              </div>

              {/* Interested Masters */}
              <div className="md:col-span-2">
                <Label>Interested Master Categories</Label>
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

            {/* Submit / Reset */}
            <div className="flex gap-2 justify-end">
              <Button
                type="submit"
                className={`flex items-center gap-2 cursor-pointer ${!isDirty ? "bg-green-600 text-white disabled:bg-green-600 disabled:text-white" : ""}`}
                disabled={!isDirty}
              >
                <IconCheck size={18} /> {!isDirty ? "Saved" : "Save Company Info"}
              </Button>
              <Button type="button" variant="ghost" onClick={handleReset} className="cursor-pointer">
                <IconRefresh size={18} /> Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
