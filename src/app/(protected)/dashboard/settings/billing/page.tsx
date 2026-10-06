"use client";

import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { IconCheck, IconRefresh } from "@tabler/icons-react";
import type { Company } from "@/lib/schema";
import { updateCompanyAction } from "@/app/actions/companies";
import { toast } from "sonner";
import { useSettingsCompany } from "../settings-company";

// --- Main Form ---
export default function BillingForm() {
  const { company: loadedCompany, setCompany: setSettingsCompany } = useSettingsCompany();
  const [company, setCompany] = useState<Company | null>(loadedCompany);

  const [savedSnapshot, setSavedSnapshot] = useState<{
    company: Company;
  } | null>(loadedCompany ? { company: loadedCompany } : null);

  const emptyCompany: Company = {
    id: "",
    name: "New Company",
    logo: "",
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

  // --- Update Form Field ---
  function updateField<K extends keyof Company>(field: K, value: Company[K]) {
    setCompany((prev) => (prev ? { ...prev, [field]: value } : { ...emptyCompany, [field]: value }));
  }

  // --- Dirty Check ---
  const isDirty = useMemo(() => {
    if (!company || !savedSnapshot) return false;
    const current = { ...company};
    const saved = { ...savedSnapshot.company};
    return JSON.stringify(current) !== JSON.stringify(saved);
  }, [company, savedSnapshot]);

  // --- Submit ---
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company) return;

    const payload: Partial<Company> = {
      VAT: company.VAT,
      address_street: company.address_street,
      address_number: company.address_number,
      address_zip: company.address_zip,
      address_city: company.address_city,
      address_country: company.address_country,
      address: company.address,
    };

    try {
      const updated = await updateCompanyAction(company.id, payload);
      if (updated) {
        setCompany({
          ...updated,
        });
        setSavedSnapshot({ company: updated });
        setSettingsCompany(updated);
      }
    } catch (err) {
      console.error("Error updating company:", err);
      toast.error("Failed to save the billing details. Please try again.");
    }
  }

  // --- Reset ---
  function handleReset() {
    if (!savedSnapshot) return;
    setCompany({ ...savedSnapshot.company });
  }

  // --- Render ---
  return (
    <div className="w-full gap-4 flex flex-col">
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
                <Label htmlFor="address-street">Street</Label>
                <Input
                  id="address-street"
                  placeholder="Street"
                  value={formCompany.address_street ?? ""}
                  onChange={(e) => updateField("address_street", e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="address-number">Number</Label>
                <Input
                  id="address-number"
                  placeholder="Number"
                  value={formCompany.address_number ?? ""}
                  onChange={(e) => updateField("address_number", e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="address-city">City</Label>
                <Input
                  id="address-city"
                  placeholder="City"
                  value={formCompany.address_city ?? ""}
                  onChange={(e) => updateField("address_city", e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="address-zip">ZIP Code</Label>
                <Input
                  id="address-zip"
                  placeholder="ZIP Code"
                  value={formCompany.address_zip ?? ""}
                  onChange={(e) => updateField("address_zip", e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="address-country">Country</Label>
                <Input
                  id="address-country"
                  placeholder="Country"
                  value={formCompany.address_country ?? ""}
                  onChange={(e) => updateField("address_country", e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="vat">VAT Number</Label>
                <Input
                  id="vat"
                  placeholder="VAT Number"
                  value={formCompany.VAT ?? ""}
                  onChange={(e) => updateField("VAT", e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="submit"
                className={`flex items-center gap-2 cursor-pointer ${!isDirty ? "bg-green-600 text-white" : ""}`}
                disabled={!isDirty}
              >
                <IconCheck size={18} /> {!isDirty ? "Saved" : "Save Billing Info"}
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
