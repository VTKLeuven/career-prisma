"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { IconCheck, IconRefresh } from "@tabler/icons-react";
import type { Company, Master } from "@/lib/schema";
import { fetchMastersAction } from "@/app/actions/features";

function isFileLike(value: any): value is File {
  return typeof value === "object" && value !== null && "name" in value;
}

function CompanyHeaderCard({ company }: { company: Company }) {
  const logoSrc =
    typeof company.logo === "string"
      ? company.logo
      : isFileLike(company.logo)
      ? URL.createObjectURL(company.logo)
      : undefined;

  return (
    <Card className="rounded-2xl shadow-md bg-slate-700 text-white">
      <CardHeader className="flex items-center gap-4">
        {logoSrc && (
          <img
            src={logoSrc}
            alt={company.name || "logo"}
            className="h-12 w-12 object-contain rounded-lg"
          />
        )}
        <div>
          <CardTitle>{company.name || "Company Profile"}</CardTitle>
          {company.address_city && (
            <CardDescription>{company.address_city}</CardDescription>
          )}
        </div>
      </CardHeader>
    </Card>
  );
}

export default function CompanyForm() {
  const [company, setCompany] = useState<Company>({
    id: "",
    name: "",
    logo: "",
    short_description: "",
    long_description: "",
    category: [],
    location: "",
    website: "",
    VAT: "",
    address_street: "",
    address_number: "",
    address_zip: "",
    address_city: "",
    address_country: "",
    address: "",
  });

  const [selectedMasters, setSelectedMasters] = useState<string[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [submittedJson, setSubmittedJson] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // ✅ Fetch master options dynamically
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

  function updateField<K extends keyof Company>(field: K, value: Company[K]) {
    setCompany((prev) => ({ ...prev, [field]: value }));
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "image/png") {
      alert("Only PNG files are allowed");
      e.target.value = "";
      return;
    }
    // preview
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
    // store File locally; when saving to backend you should upload it and replace with file id / url
    updateField("logo", file as any);
  }

  function toggleMaster(id: string) {
    setSelectedMasters((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Company = {
      ...company,
      category: selectedMasters as any,
      logo: isFileLike(company.logo)
        ? (logoPreview ?? "")
        : (company.logo as any) ?? "",
    };
    setCompany(payload);
    setSubmittedJson(JSON.stringify(payload, null, 2));
  }


  function handleReset() {
    setCompany({
      id: "",
      name: "",
      logo: "",
      short_description: "",
      long_description: "",
      category: [],
      location: "",
      website: "",
      VAT: "",
      address_street: "",
      address_number: "",
      address_zip: "",
      address_city: "",
      address_country: "",
      address: "",
    });
    setSelectedMasters([]);
    setLogoPreview(null);
    setSubmittedJson(null);
  }

  return (
    <div className="w-full gap-4 flex flex-col">
      <CompanyHeaderCard company={company} />

      {/* --- Company Information Section --- */}
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
              <div className="space-y-3">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  placeholder="Company Name"
                  value={company.name ?? ""}
                  onChange={(e) => updateField("name", e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="company-logo">Company Logo (PNG)</Label>
                <Input
                  id="company-logo"
                  type="file"
                  accept=".png"
                  onChange={handleLogoUpload}
                />
                {logoPreview && (
                  <img
                    src={logoPreview}
                    alt="Logo Preview"
                    className="h-12 mt-2 object-contain"
                  />
                )}
              </div>

              <div className="space-y-3 md:col-span-2">
                <Label htmlFor="short-description">Short Description</Label>
                <Input
                  id="short-description"
                  placeholder="Brief company description"
                  value={company.short_description ?? ""}
                  onChange={(e) => updateField("short_description", e.target.value)}
                />
              </div>

              <div className="space-y-3 md:col-span-2">
                <Label htmlFor="long-description">Long Description</Label>
                <Textarea
                  id="long-description"
                  placeholder="Provide a detailed company description..."
                  value={company.long_description ?? ""}
                  onChange={(e) => updateField("long_description", e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="City, Country"
                  value={company.location ?? ""}
                  onChange={(e) => updateField("location", e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://example.com"
                  value={company.website ?? ""}
                  onChange={(e) => updateField("website", e.target.value)}
                />
              </div>

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
                        className={`
                          w-full py-2 rounded-lg border transition text-center
                          ${selected 
                            ? "bg-slate-700 text-white border-slate-700" 
                            : "bg-white text-black border-gray-300"}
                          hover:opacity-90
                        `}
                      >
                        {opt.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="submit" className="flex items-center gap-2">
                <IconCheck size={18} /> Save Company Info
              </Button>
              <Button type="button" variant="ghost" onClick={handleReset}>
                <IconRefresh size={18} /> Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* --- Billing Section --- */}
      <Card className="rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Billing Information</CardTitle>
          <CardDescription>
            Provide your company's billing and address details.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="vat">VAT Number</Label>
                <Input
                  id="vat"
                  placeholder="VAT Number"
                  value={company.VAT ?? ""}
                  onChange={(e) => updateField("VAT", e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="address-street">Street</Label>
                <Input
                  id="address-street"
                  placeholder="Street"
                  value={company.address_street ?? ""}
                  onChange={(e) => updateField("address_street", e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="address-number">Number</Label>
                <Input
                  id="address-number"
                  placeholder="Number"
                  value={company.address_number ?? ""}
                  onChange={(e) => updateField("address_number", e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="address-zip">ZIP Code</Label>
                <Input
                  id="address-zip"
                  placeholder="ZIP Code"
                  value={company.address_zip ?? ""}
                  onChange={(e) => updateField("address_zip", e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="address-city">City</Label>
                <Input
                  id="address-city"
                  placeholder="City"
                  value={company.address_city ?? ""}
                  onChange={(e) => updateField("address_city", e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="address-country">Country</Label>
                <Input
                  id="address-country"
                  placeholder="Country"
                  value={company.address_country ?? ""}
                  onChange={(e) => updateField("address_country", e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="submit" className="flex items-center gap-2">
                <IconCheck size={18} /> Save Billing Info
              </Button>
              <Button type="button" variant="ghost" onClick={handleReset}>
                <IconRefresh size={18} /> Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* --- Submitted JSON (demo) --- */}
      {submittedJson && (
        <Card className="rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle>Submitted Data (demo)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="mt-2 p-3 rounded-lg bg-muted text-sm overflow-auto">
              {submittedJson}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
