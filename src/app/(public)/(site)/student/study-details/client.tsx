"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StudyFields } from "@/components/student/StudyFields";
import { saveStudyDetailsAction } from "@/app/actions/student-study";

export default function StudyDetailsClient({
  redirectTo,
  name,
  programmes: initialProgrammes,
  years: initialYears,
  editable,
}: {
  redirectTo: string;
  name: string | null;
  programmes: string[];
  years: string[];
  editable: { programmes: boolean; years: boolean };
}) {
  const router = useRouter();
  const [programmes, setProgrammes] = useState<string[]>(initialProgrammes);
  const [years, setYears] = useState<string[]>(initialYears);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const result = await saveStudyDetailsAction({ programmes, years });

    if (!result.ok) {
      setError(result.error);
      setSaving(false);
      return;
    }

    router.refresh();
    router.replace(redirectTo);
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>
            {name ? `Welcome, ${name}` : "A few more details"}
          </CardTitle>
          <CardDescription>
            We could not find your study programme in your VTK account, so we
            need you to fill it in. Companies use it to find you at our events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={onSubmit}>
            <StudyFields
              programmes={programmes}
              years={years}
              onProgrammesChange={setProgrammes}
              onYearsChange={setYears}
              programmesDisabled={!editable.programmes}
              yearsDisabled={!editable.years}
            />

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full cursor-pointer" disabled={saving}>
              {saving ? "Saving…" : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
