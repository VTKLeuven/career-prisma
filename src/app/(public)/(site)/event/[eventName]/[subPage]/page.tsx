"use client";

import React, { useState, useEffect, useCallback } from "react";
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

function isFileLike(value: any): value is File {
  return typeof value === "object" && value !== null && "name" in value;
}

// Convert plain text to clean HTML paragraphs
function toCleanHTML(text?: string): string {
  if (!text) return "";
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => `<p>${line}</p>`)
    .join("");
}

// Compare two companies for changes
function isCompanyEqual(a: Company, b: Company) {
  return JSON.stringify(a) === JSON.stringify(b);
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
          <img src={logoSrc} alt={company.name || "logo"} className="h-12 w-12 object-contain rounded-lg" />
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
  const [initialCompany, setInitialCompany] = useState<Company | null>(null);
  const [selectedMasters, setSelectedMasters] = useState<string[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [submittedJson, setSubmittedJson] = useState<string | null>(null);
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

  // Load Masters
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

  // Load Company
  useEffect(() => {
    async function loadCompany() {
      if (!user?.company) return;
      try {
        const fetchedCompany = await fetchCompanyByIdAction(user.company.id);
        if (fetchedCompany) {
          setCompany(fetchedCompany);
          setInitialCompany(fetchedCompany); // snapshot for comparison
          setSelectedMasters(fetchedCompany.category?.map((c: any) => c.id) || []);
          setLogoPreview(typeof fetchedCompany.logo === "string" ? getDirectusImageUrl(fetchedCompany.logo) ?? null : null);
        }
      } catch (err) {
        console.error("Error fetching company:", err);
      }
    }
    loadCompany();
  }, [user?.company]);

  function updateField<K extends keyof Company>(field: K, value: Company[K]) {
    setCompany(prev => (prev ? { ...prev, [field]: value } : { ...emptyCompany, [field]: value }));
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
    updateField("logo", file as any);
  }

  function toggleMaster(id: string) {
    setSelectedMasters(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  const isDirty = useCallback(() => {
    if (!company || !initialCompany) return false;

    const currentPayload = {
      ...company,
      category: masters.filter(m => selectedMasters.includes(m.id)),
      short_description: toCleanHTML(company.short_description),
      long_description: toCleanHTML(company.long_description),
    };
    return !isCompanyEqual(currentPayload, initialCompany);
  }, [company, initialCompany, selectedMasters, masters]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company) return;

    let logoId: string | undefined = undefined;
    if (isFileLike(company.logo)) {
      const uploaded = await uploadCompanyLogo(company.logo);
      logoId = uploaded ?? undefined;
    } else if (typeof company.logo === "string") {
      logoId = company.logo;
    }

    const payload: Partial<Company> = {
      ...company,
      short_description: toCleanHTML(company.short_description),
      long_description: toCleanHTML(company.long_description),
      category: masters.filter(m => selectedMasters.includes(m.id)),
      logo: logoId,
    };

    try {
      const updated = await updateCompanyAction(company.id, payload);
      setCompany(updated);
      setInitialCompany(updated); // reset snapshot
      setSubmittedJson(JSON.stringify(updated, null, 2));
    } catch (err) {
      console.error("Error updating company:", err);
      alert("Failed to update company.");
    }
  }

  function handleReset() {
    if (!initialCompany) return;
    setCompany({ ...initialCompany });
    setSelectedMasters(initialCompany.category?.map((c: any) => c.id) || []);
    setLogoPreview(typeof initialCompany.logo === "string" ? getDirectusImageUrl(initialCompany.logo) ?? null : null);
    setSubmittedJson(null);
  }

  return (
    <div className="w-full gap-4 flex flex-col">
      <CompanyHeaderCard company={company} />

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
                <Label>Company Name</Label>
                <Input value={formCompany.name ?? ""} onChange={e => updateField("name", e.target.value)} />
              </div>

              <div className="space-y-3">
                <Label>Company Logo (PNG)</Label>
                <Input type="file" accept=".png" onChange={handleLogoUpload} />
                {logoPreview && <img src={logoPreview} alt="Logo Preview" className="h-12 mt-2 object-contain" />}
              </div>

              <div className="space-y-3 md:col-span-2">
                <Label>Short Description</Label>
                <Textarea value={formCompany.short_description ?? ""} onChange={e => updateField("short_description", e.target.value)} />
              </div>

              <div className="space-y-3 md:col-span-2">
                <Label>Long Description</Label>
                <Textarea value={formCompany.long_description ?? ""} onChange={e => updateField("long_description", e.target.value)} />
              </div>

              <div className="space-y-3">
                <Label>Location</Label>
                <Input value={formCompany.location ?? ""} onChange={e => updateField("location", e.target.value)} />
              </div>

              <div className="space-y-3">
                <Label>Website</Label>
                <Input type="url" value={formCompany.website ?? ""} onChange={e => updateField("website", e.target.value)} />
              </div>

              <div className="md:col-span-2">
                <Label>Interested Master Categories</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-4">
                  {masters.map(opt => {
                    const selected = selectedMasters.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleMaster(opt.id)}
                        className={`w-full py-2 rounded-lg border transition text-center ${
                          selected ? "bg-slate-700 text-white border-slate-700" : "bg-white text-black border-gray-300"
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
              <Button type="submit" className={`flex items-center gap-2 ${!isDirty() ? "bg-green-600" : ""}`}>
                <IconCheck size={18} /> {!isDirty() ? "Saved" : "Save Company Info"}
              </Button>
              <Button type="button" variant="ghost" onClick={handleReset}>
                <IconRefresh size={18} /> Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {submittedJson && (
        <Card className="rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle>Submitted Data (demo)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="mt-2 p-3 rounded-lg bg-muted text-sm overflow-auto">{submittedJson}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
