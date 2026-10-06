"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { VacancyForm, type VacancyFormData } from "@/components/vacancies/VacancyForm";
import { createVacancyAction, updateVacancyAction } from "@/app/actions/vacancies";
import type { Master, Vacancy, VacancySectionConfig, VacancySector, VacancyType } from "@/lib/schema";

export type VacancyFormOptions = {
  types: VacancyType[];
  sectors: VacancySector[];
  sectionConfigs: VacancySectionConfig[];
  masters: Master[];
};

/** The new- and edit-vacancy screens; the pages load the vacancy and options on the server. */
export function VacancyEditor({ vacancy, ...options }: VacancyFormOptions & { vacancy?: Vacancy }) {
  const router = useRouter();

  const handleSubmit = async (data: VacancyFormData) => {
    const payload: Partial<Vacancy> = {
      title: data.title,
      type: data.type,
      sectors: data.sectors,
      location: data.location,
      contact_email: data.contact_email,
      contact_name: data.contact_name,
      contact_phone: data.contact_phone,
      sections: data.sections,
      masters: data.masters.map((id) => ({ master_id: id })) as unknown as Vacancy["masters"],
      status: data.status,
    };
    try {
      const saved = vacancy ? await updateVacancyAction(vacancy.id, payload) : await createVacancyAction(payload);
      if (!saved) throw new Error("The vacancy could not be saved.");
      router.push("/dashboard/job-platform/vacancies");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The vacancy could not be saved.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/job-platform/vacancies" aria-label="Back to vacancies">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h2 className="text-2xl font-bold">{vacancy ? "Edit Vacancy" : "New Vacancy"}</h2>
      </div>
      <VacancyForm
        vacancy={vacancy}
        {...options}
        onSubmit={handleSubmit}
        submitLabel={vacancy ? "Update Vacancy" : "Create Vacancy"}
      />
    </div>
  );
}
