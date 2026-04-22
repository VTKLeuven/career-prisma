"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { VacancyForm, type VacancyFormData } from "@/components/vacancies/VacancyForm";
import {
  fetchVacancyTypesAction,
  fetchVacancySectorsAction,
  fetchVacancySectionConfigsAction,
  fetchVacancyByIdAction,
  updateVacancyAction,
} from "@/app/actions/vacancies";
import { fetchMastersAction } from "@/app/actions/features";
import type {
  Vacancy,
  VacancyType,
  VacancySector,
  VacancySectionConfig,
  Master,
} from "@/lib/schema";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function EditVacancyPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [types, setTypes] = useState<VacancyType[]>([]);
  const [sectors, setSectors] = useState<VacancySector[]>([]);
  const [sectionConfigs, setSectionConfigs] = useState<VacancySectionConfig[]>(
    []
  );
  const [masters, setMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchVacancyByIdAction(id),
      fetchVacancyTypesAction(),
      fetchVacancySectorsAction(),
      fetchVacancySectionConfigsAction(),
      fetchMastersAction(),
    ]).then(([v, t, s, sc, m]) => {
      setVacancy(v);
      setTypes(t ?? []);
      setSectors(s ?? []);
      setSectionConfigs(sc ?? []);
      setMasters(m ?? []);
      setLoading(false);
    });
  }, [id]);

  const handleSubmit = async (data: VacancyFormData) => {
    await updateVacancyAction(id, {
      title: data.title,
      type: data.type,
      sectors: data.sectors,
      location: data.location,
      contact_email: data.contact_email,
      contact_name: data.contact_name,
      contact_phone: data.contact_phone,
      sections: data.sections,
      masters: data.masters.map((mid) => ({ master_id: mid })) as any,
      status: data.status,
    });
    router.push("/dashboard/job-platform/vacancies");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-96 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!vacancy) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Vacancy not found.</p>
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
        <h2 className="text-2xl font-bold">Edit Vacancy</h2>
      </div>
      <VacancyForm
        vacancy={vacancy}
        types={types}
        sectors={sectors}
        sectionConfigs={sectionConfigs}
        masters={masters}
        onSubmit={handleSubmit}
        submitLabel="Update Vacancy"
      />
    </div>
  );
}
