"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { STUDY_PROGRAMMES, STUDY_YEARS, type StudyOption } from "@/lib/study-options";
import { cn } from "@/lib/utils";

function toggle(value: string, current: string[]): string[] {
  return current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
}

function OptionList({
  idPrefix,
  legend,
  options,
  selected,
  disabled,
  onChange,
}: {
  idPrefix: string;
  legend: string;
  options: StudyOption[];
  selected: string[];
  disabled: boolean;
  onChange: (next: string[]) => void;
}) {
  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="text-sm font-medium mb-2">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <Checkbox
              id={`${idPrefix}-${option.value}`}
              checked={selected.includes(option.value)}
              disabled={disabled}
              onCheckedChange={() => onChange(toggle(option.value, selected))}
            />
            <Label
              htmlFor={`${idPrefix}-${option.value}`}
              className={cn(
                "text-sm font-normal",
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
              )}
            >
              {option.labelEn}
            </Label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Programme and year checkboxes. Which of the two a student may change is
 * decided by `studyEditability()`; a locked list stays visible, greyed out, so
 * the student can still see what vtk.be has on file for them.
 */
export function StudyFields({
  programmes,
  years,
  onProgrammesChange,
  onYearsChange,
  programmesDisabled = false,
  yearsDisabled = false,
}: {
  programmes: string[];
  years: string[];
  onProgrammesChange: (next: string[]) => void;
  onYearsChange: (next: string[]) => void;
  programmesDisabled?: boolean;
  yearsDisabled?: boolean;
}) {
  return (
    <div className="space-y-6">
      <OptionList
        idPrefix="programme"
        legend="What do you study?"
        options={STUDY_PROGRAMMES}
        selected={programmes}
        disabled={programmesDisabled}
        onChange={onProgrammesChange}
      />
      <OptionList
        idPrefix="year"
        legend="Which year are you in?"
        options={STUDY_YEARS}
        selected={years}
        disabled={yearsDisabled}
        onChange={onYearsChange}
      />
    </div>
  );
}
