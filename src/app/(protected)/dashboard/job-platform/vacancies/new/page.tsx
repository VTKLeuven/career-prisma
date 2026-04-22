"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { VacancyForm, type VacancyFormData } from "@/components/vacancies/VacancyForm";
import {
  fetchVacancyTypesAction,
  fetchVacancySectorsAction,
  fetchVacancySectionConfigsAction,
  createVacancyAction,
} from "@/app/actions/vacancies";
import { fetchMastersAction } from "@/app/actions/features";
import type { VacancyType, VacancySector, VacancySectionConfig, Master } from "@/lib/schema";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NewVacancyPage() {
  const router = useRouter();
  const [types, setTypes] = useState<VacancyType[]>([]);
  const [sectors, setSectors] = useState<VacancySector[]>([]);
  const [sectionConfigs, setSectionConfigs] = useState<VacancySectionConfig[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchVacancyTypesAction(),
      fetchVacancySectorsAction(),
      fetchVacancySectionConfigsAction(),
      fetchMastersAction(),
    ]).then(([t, s, sc, m]) => {
      setTypes(t ?? []);
      setSectors(s ?? []);
      setSectionConfigs(sc ?? []);
      setMasters(m ?? []);
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (data: VacancyFormData) => {
    const result = await createVacancyAction({
      title: data.title,
      type: data.type,
      sectors: data.sectors,
      location: data.location,
      contact_email: data.contact_email,
      contact_name: data.contact_name,
      contact_phone: data.contact_phone,
      sections: data.sections,
      masters: data.masters.map((id) => ({ master_id: id })) as any,
      status: data.status,
    });
    if (result) {
      router.push("/dashboard/job-platform/vacancies");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-96 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/job-platform/vacancies">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h2 className="text-2xl font-bold">New Vacancy</h2>
      </div>
      <VacancyForm
        types={types}
        sectors={sectors}
        sectionConfigs={sectionConfigs}
        masters={masters}
        onSubmit={handleSubmit}
        submitLabel="Create Vacancy"
      />
    </div>
  );
}
