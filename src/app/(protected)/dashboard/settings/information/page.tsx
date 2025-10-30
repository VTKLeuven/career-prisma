"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { IconCheck, IconRefresh } from "@tabler/icons-react";
import type { Company, Master } from "@/lib/schema";
import { fetchMastersAction } from "@/app/actions/features";
import { updateCompanyAction, fetchCompanyByIdAction, uploadCompanyLogo } from "@/app/actions/companies";
import { useUser } from "@/providers/UserProvider";
import { getDirectusImageUrl } from "@/components/Images";
import NextImage from "next/image";

function isFileLike(value: unknown): value is File {
  return typeof value === "object" && value !== null && "name" in value;
}

function CompanyHeaderCard({ company }: { company: Company | null }) {
  if (!company) {
    return (
      <Card className="rounded-2xl shadow-md bg-slate-700 text-white">
        <CardHeader>
          <CardTitle>Company Profile</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const logoSrc =
    isFileLike(company.logo)
      ? URL.createObjectURL(company.logo)
      : getDirectusImageUrl(company.logo);

  return (
    <Card className="rounded-2xl shadow-md bg-slate-700 text-white">
      <CardHeader className="flex items-center gap-4">
        {logoSrc && (
          <NextImage src={logoSrc} alt={company.name || "logo"} width={48} height={48} className="object-contain rounded-lg" />
        )}
        <div>
          <CardTitle>{company.name || "Company Profile"}</CardTitle>
          {company.address_city && <CardDescription>{company.address_city}</CardDescription>}
        </div>
      </CardHeader>
    </Card>
  );
}

export default function CompanyForm() {
  const { user } = useUser();
  const [company, setCompany] = useState<Company | null>(null);
  const [selectedMasters, setSelectedMasters] = useState<string[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const emptyCompany: Company = {
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
  };

  const formCompany = company || emptyCompany;

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

  useEffect(() => {
    async function loadCompany() {
      if (!user?.company) return;
      try {
        const fetchedCompany = await fetchCompanyByIdAction(user.company.id);
        if (fetchedCompany) {
          setCompany(fetchedCompany);
          setSelectedMasters(fetchedCompany.category?.map((c: Master) => c.id) || []);
          setLogoPreview(typeof fetchedCompany.logo === "string" ? getDirectusImageUrl(fetchedCompany.logo) ?? null : null);
        } else {
          setCompany(null);
          setSelectedMasters([]);
          setLogoPreview(null);
        }
      } catch (err) {
        console.error("Error fetching company:", err);
        setCompany(null);
        setSelectedMasters([]);
        setLogoPreview(null);
      }
    }
    loadCompany();
  }, [user?.company]);

  function updateField<K extends keyof Company>(field: K, value: Company[K]) {
    setCompany((prev) => (prev ? { ...prev, [field]: value } : { ...emptyCompany, [field]: value }));
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "image/png") {
      alert("Only PNG files are allowed");
      e.target.value = "";
      return;
    }
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
    updateField("logo", file as unknown as string);
  }

  function toggleMaster(id: string) {
    setSelectedMasters((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company) return;

    let logoId: string | undefined = undefined;

    // If a new file is uploaded
    if (isFileLike(company.logo)) {
      const uploaded = await uploadCompanyLogo(company.logo);
      logoId = uploaded ?? undefined; // convert null -> undefined
    } else if (typeof company.logo === "string") {
      logoId = company.logo; // keep existing
    }

    const payload: Partial<Company> = {
      name: company.name,
      short_description: company.short_description,
      long_description: company.long_description,
      category: masters.filter((m) => selectedMasters.includes(m.id)), // Master[]
      location: company.location,
      website: company.website,
      VAT: company.VAT,
      address_street: company.address_street,
      address_number: company.address_number,
      address_zip: company.address_zip,
      address_city: company.address_city,
      address_country: company.address_country,
      address: company.address,
      logo: logoId, // safe assignment
    };

    try {
      const updated = await updateCompanyAction(company.id, payload);
      setCompany(updated);
      alert("Company updated successfully!");
    } catch (err) {
      console.error("Error updating company:", err);
      alert("Failed to update company.");
    }
  }

  function handleReset() {
    if (!company) return;
    setCompany({ ...company });
    setSelectedMasters(company.category?.map((c: Master) => c.id) || []);
    setLogoPreview(typeof company.logo === "string" ? getDirectusImageUrl(company.logo) ?? null : null);
  }

  return (
    <div className="w-full gap-4 flex flex-col">
      <CompanyHeaderCard company={company} />

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
              <div className="space-y-3">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  placeholder="Company Name"
                  value={formCompany.name ?? ""}
                  onChange={(e) => updateField("name", e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="company-logo">Company Logo (PNG)</Label>
                <Input type="file" accept=".png" onChange={handleLogoUpload} />
                {logoPreview && (
                  <NextImage src={logoPreview} alt="Logo Preview" width={48} height={48} className="mt-2 object-contain" />
                )}
              </div>
              <div className="space-y-3 md:col-span-2">
                <Label htmlFor="short-description">Short Description</Label>
                <Input
                  placeholder="Brief company description"
                  value={formCompany.short_description ?? ""}
                  onChange={(e) => updateField("short_description", e.target.value)}
                />
              </div>
              <div className="space-y-3 md:col-span-2">
                <Label htmlFor="long-description">Long Description</Label>
                <Textarea
                  placeholder="Provide a detailed company description..."
                  value={formCompany.long_description ?? ""}
                  onChange={(e) => updateField("long_description", e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="location">Location</Label>
                <Input
                  placeholder="City, Country"
                  value={formCompany.location ?? ""}
                  onChange={(e) => updateField("location", e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="website">Website</Label>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={formCompany.website ?? ""}
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
                        className={`w-full py-2 rounded-lg border transition text-center ${
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

      {/* Billing Section */}
      <Card className="rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Billing Information</CardTitle>
          <CardDescription>Provide your company&apos;s billing and address details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="vat">VAT Number</Label>
                <Input
                  placeholder="VAT Number"
                  value={formCompany.VAT ?? ""}
                  onChange={(e) => updateField("VAT", e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="address-street">Street</Label>
                <Input
                  placeholder="Street"
                  value={formCompany.address_street ?? ""}
                  onChange={(e) => updateField("address_street", e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="address-number">Number</Label>
                <Input
                  placeholder="Number"
                  value={formCompany.address_number ?? ""}
                  onChange={(e) => updateField("address_number", e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="address-zip">ZIP Code</Label>
                <Input
                  placeholder="ZIP Code"
                  value={formCompany.address_zip ?? ""}
                  onChange={(e) => updateField("address_zip", e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="address-city">City</Label>
                <Input
                  placeholder="City"
                  value={formCompany.address_city ?? ""}
                  onChange={(e) => updateField("address_city", e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="address-country">Country</Label>
                <Input
                  placeholder="Country"
                  value={formCompany.address_country ?? ""}
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
    </div>
  );
}
