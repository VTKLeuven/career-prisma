"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { IconCheck, IconRefresh } from "@tabler/icons-react";
import type { Company, Master } from "@/lib/schema";
import { fetchMastersAction } from "@/app/actions/features";
import { updateCompanyAction, fetchCompanyByIdAction, uploadCompanyLogo } from "@/app/actions/companies";
import { useUser } from "@/providers/UserProvider";
import { getDirectusImageUrl } from "@/components/Images";
import NextImage from "next/image";

// --- Tiptap ---
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

const EditorContent = dynamic(
  () => import("@tiptap/react").then((mod) => mod.EditorContent),
  { ssr: false }
);

// --- Helpers ---
function isFileLike(value: unknown): value is File {
  return typeof value === "object" && value !== null && "name" in value;
}

// --- Main Form ---
export default function CompanyForm() {
  const { user } = useUser();
  const [company, setCompany] = useState<Company | null>(null);
  const [selectedMasters, setSelectedMasters] = useState<string[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [pageImagePreview, setPageImagePreview] = useState<string | null>(null);

  const [savedSnapshot, setSavedSnapshot] = useState<{
    company: Company;
    selectedMasters: string[];
  } | null>(null);

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

  // --- Load Masters ---
  useEffect(() => {
    async function loadMasters() {
      try {
        const data = await fetchMastersAction();
        setMasters(data);
      } catch (err) {
        console.error("Error loading masters:", err);
      }
    }
    loadMasters();
  }, []);

  // --- Load Company ---
  useEffect(() => {
    async function loadCompany() {
      if (!user?.company) return;
      try {
        const fetchedCompany = await fetchCompanyByIdAction(user.company.id);
        if (fetchedCompany) {
          setCompany(fetchedCompany);
          // Extract category IDs from junction objects or direct Master objects
          const categoryIds: string[] = [];
          if (Array.isArray(fetchedCompany.category)) {
            for (const c of fetchedCompany.category) {
              if (typeof c === 'string') {
                categoryIds.push(c);
              } else if (c && typeof c === 'object') {
                // Check if it's a junction object: { master_id: Master }
                if ('master_id' in c) {
                  const masterId = (c as { master_id: Master | string | null }).master_id;
                  if (typeof masterId === 'string') {
                    categoryIds.push(masterId);
                  } else if (masterId && typeof masterId === 'object' && 'id' in masterId) {
                    categoryIds.push(masterId.id);
                  }
                } 
                // Check if it's a Master object directly: { id: string, ... }
                else if ('id' in c && typeof (c as { id: unknown }).id === 'string') {
                  categoryIds.push((c as { id: string }).id);
                }
              }
            }
          }
          setSelectedMasters(categoryIds);
          setLogoPreview(typeof fetchedCompany.logo === "string" ? getDirectusImageUrl(fetchedCompany.logo) ?? null : null);
          setPageImagePreview(typeof fetchedCompany.page_image === "string" ? getDirectusImageUrl(fetchedCompany.page_image) ?? null : null);
          setSavedSnapshot({
            company: fetchedCompany,
            selectedMasters: categoryIds,
          });
        } else {
          setCompany(null);
          setSelectedMasters([]);
          setLogoPreview(null);
          setPageImagePreview(null);
          setSavedSnapshot(null);
        }
      } catch (err) {
        console.error("Error fetching company:", err);
        setCompany(null);
        setSelectedMasters([]);
        setLogoPreview(null);
        setPageImagePreview(null);
        setSavedSnapshot(null);
      }
    }
    loadCompany();
  }, [user?.company]);

  // --- Update Form Field ---
  function updateField<K extends keyof Company>(field: K, value: Company[K]) {
    setCompany((prev) => (prev ? { ...prev, [field]: value } : { ...emptyCompany, [field]: value }));
  }

  // --- Logo Upload ---
  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "image/png") {
      e.target.value = "";
      return;
    }
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
    updateField("logo", file as unknown as string);
  }

  // --- Page Image Upload ---
  function handlePageImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      e.target.value = "";
      return;
    }
    const url = URL.createObjectURL(file);
    setPageImagePreview(url);
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
    const current = { ...company, category: selectedMasters };
    const saved = { ...savedSnapshot.company, category: savedSnapshot.selectedMasters };
    return JSON.stringify(current) !== JSON.stringify(saved);
  }, [company, selectedMasters, savedSnapshot]);

  // --- Editor Classes ---
  const editorClasses = "border rounded-md p-2 bg-white text-sm text-gray-900 min-h-[80px] focus:outline-none focus:ring-1 focus:ring-slate-400";

  // --- Tiptap Editors with placeholder ---
  const shortDescEditor = useEditor({
    extensions: [StarterKit],
    content: formCompany.short_description,
    onUpdate({ editor }) {
      updateField("short_description", editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: editorClasses,
        "data-placeholder": "Enter a brief description of your company...",
      },
    },
    immediatelyRender: false,
  });

  const longDescEditor = useEditor({
    extensions: [StarterKit],
    content: formCompany.long_description,
    onUpdate({ editor }) {
      updateField("long_description", editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: editorClasses + " min-h-[120px]",
        "data-placeholder": "Enter a more detailed description about your company, mission, and activities...",
      },
    },
    immediatelyRender: false,
  });

  // --- Set initial content when company loads ---
  useEffect(() => {
    if (company) {
      shortDescEditor?.commands.setContent(company.short_description || "");
      longDescEditor?.commands.setContent(company.long_description || "");
    }
  }, [company, shortDescEditor, longDescEditor]);

  // --- Submit ---
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company) return;

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

    const payload: Partial<Company> = {
      name: company.name,
      short_description: company.short_description,
      long_description: company.long_description,
      category: masters.filter((m) => selectedMasters.includes(m.id)).map((m) => ({ master_id: m.id })),
      location: company.location,
      website: company.website,
      logo: logoId,
      page_image: pageImageId,
    };

    try {
      const updated = await updateCompanyAction(company.id, payload);
      if (updated) {
        const persistedMasters = [...selectedMasters];
        setSavedSnapshot({
          company: updated,
          selectedMasters: persistedMasters,
        });
        setCompany({
          ...updated,
          category: masters.filter((m) => persistedMasters.includes(m.id)),
        });
        setSelectedMasters(persistedMasters);
        setLogoPreview(
          typeof updated.logo === "string"
            ? getDirectusImageUrl(updated.logo) ?? null
            : null
        );
        setPageImagePreview(
          typeof updated.page_image === "string"
            ? getDirectusImageUrl(updated.page_image) ?? null
            : null
        );
      }
    } catch (err) {
      console.error("Error updating company:", err);
    }
  }

  // --- Reset ---
  function handleReset() {
    if (!savedSnapshot) return;
    setCompany({ ...savedSnapshot.company });
    setSelectedMasters([...savedSnapshot.selectedMasters]);
    setLogoPreview(typeof savedSnapshot.company.logo === "string" ? getDirectusImageUrl(savedSnapshot.company.logo) ?? null : null);
    setPageImagePreview(typeof savedSnapshot.company.page_image === "string" ? getDirectusImageUrl(savedSnapshot.company.page_image) ?? null : null);
    shortDescEditor?.commands.setContent(savedSnapshot.company.short_description || "");
  }

  // --- Render ---
  return (
    <div className="w-full gap-4 flex flex-col">
      {/* Company Information Section */}
      <Card className="rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Company Information</CardTitle>
          <CardDescription>
            Provide general company details. This information will be visible on your profile and used for events.
          </CardDescription>
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

              {/* Logo */}
              <div className="space-y-3">
                <Label>Company Logo (PNG)</Label>
                <div className="flex flex-col items-center gap-2">
                  {logoPreview ? (
                    <NextImage
                      src={logoPreview}
                      alt="Company Logo"
                      width={48}
                      height={48}
                      className="h-12 w-12 object-contain rounded-md"
                    />
                  ) : formCompany.logo ? (
                    <NextImage
                      src={getDirectusImageUrl(formCompany.logo) ?? ""}
                      alt="Company Logo"
                      width={48}
                      height={48}
                      className="h-12 w-12 object-contain rounded-md"
                    />
                  ) : (
                    <div className="h-12 w-12 flex items-center justify-center rounded-md bg-gray-100 text-gray-500 text-sm whitespace-nowrap">
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
                          updateField("logo", "");
                        }}
                      >
                        Remove
                      </Button>
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
              </div>

            {/* Page Background Image */}
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
                ) : formCompany.page_image ? (
                  <NextImage
                    src={getDirectusImageUrl(formCompany.page_image) ?? ""}
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
                        updateField("page_image", "");
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
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
                <Label htmlFor="short-description">Short Description</Label>
                <EditorContent editor={shortDescEditor} />
              </div>

              {/* Long Description */}
              <div className="space-y-3 md:col-span-2">
                <Label htmlFor="long-description">Long Description</Label>
                <EditorContent editor={longDescEditor} />
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
                            ? "bg-slate-700 text-white border-slate-700"
                            : "bg-white text-black border-gray-300"
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
