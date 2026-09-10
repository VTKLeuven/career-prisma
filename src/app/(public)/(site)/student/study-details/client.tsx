"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { STUDY_PROGRAMMES, STUDY_YEARS } from "@/lib/study-options";
import { saveStudyDetailsAction } from "@/app/actions/student-study";

export default function StudyDetailsClient({
  redirectTo,
  name,
  programmes: initialProgrammes,
  years: initialYears,
}: {
  redirectTo: string;
  name: string | null;
  programmes: string[];
  years: string[];
}) {
  const router = useRouter();
  const [programmes, setProgrammes] = useState<string[]>(initialProgrammes);
  const [years, setYears] = useState<string[]>(initialYears);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(
    value: string,
    current: string[],
    set: (next: string[]) => void
  ) {
    set(
      current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
    );
  }

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
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium mb-2">
                What do you study?
              </legend>
              {STUDY_PROGRAMMES.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`programme-${option.value}`}
                    checked={programmes.includes(option.value)}
                    onCheckedChange={() =>
                      toggle(option.value, programmes, setProgrammes)
                    }
                  />
                  <Label
                    htmlFor={`programme-${option.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option.labelEn}
                  </Label>
                </div>
              ))}
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium mb-2">
                Which year are you in?
              </legend>
              {STUDY_YEARS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`year-${option.value}`}
                    checked={years.includes(option.value)}
                    onCheckedChange={() => toggle(option.value, years, setYears)}
                  />
                  <Label
                    htmlFor={`year-${option.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option.labelEn}
                  </Label>
                </div>
              ))}
            </fieldset>

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
