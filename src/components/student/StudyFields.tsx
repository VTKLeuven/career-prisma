"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { STUDY_YEARS } from "@/lib/study-options";
import type { StudyChoiceGroup, StudyChoiceOption } from "@/lib/study-choices";
import { cn } from "@/lib/utils";

const YEAR_OPTIONS: StudyChoiceOption[] = STUDY_YEARS.map((y) => ({ value: y.value, label: y.labelEn }));

function toggle(value: string, current: string[]): string[] {
  return current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
}

function OptionGrid({
  idPrefix,
  options,
  selected,
  disabled,
  onChange,
}: {
  idPrefix: string;
  options: StudyChoiceOption[];
  selected: string[];
  disabled: boolean;
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const id = `${idPrefix}-${option.value.replace(/[^a-z0-9_-]/gi, "-")}`;
        return (
          <div key={option.value} className="flex items-center space-x-2">
            <Checkbox
              id={id}
              checked={selected.includes(option.value)}
              disabled={disabled}
              onCheckedChange={() => onChange(toggle(option.value, selected))}
            />
            <Label
              htmlFor={id}
              className={cn(
                "text-sm font-normal",
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
              )}
            >
              {option.label}
            </Label>
          </div>
        );
      })}
    </div>
  );
}

/**
 * The study checklists. "What do you study?" lists the masters and faculties
 * of the admin's Education tab (`studyChoiceGroups()`), grouped by faculty;
 * the year list is vtk.be's vocabulary. Which of the two a student may change
 * is decided by `studyEditability()`; a locked list stays visible, greyed out,
 * so the student can still see what vtk.be has on file for them.
 */
export function StudyFields({
  studyGroups,
  studies,
  years,
  onStudiesChange,
  onYearsChange,
  studiesDisabled = false,
  yearsDisabled = false,
}: {
  studyGroups: StudyChoiceGroup[];
  studies: string[];
  years: string[];
  onStudiesChange: (next: string[]) => void;
  onYearsChange: (next: string[]) => void;
  studiesDisabled?: boolean;
  yearsDisabled?: boolean;
}) {
  return (
    <div className="space-y-6">
      <fieldset className="space-y-3" disabled={studiesDisabled}>
        <legend className="text-sm font-medium mb-2">What do you study?</legend>
        {studyGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No masters or faculties have been set up yet.
          </p>
        ) : (
          studyGroups.map((group, index) => (
            <div key={group.label} className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              <OptionGrid
                idPrefix={`study-${index}`}
                options={group.options}
                selected={studies}
                disabled={studiesDisabled}
                onChange={onStudiesChange}
              />
            </div>
          ))
        )}
        {studiesDisabled && studies.length === 0 && studyGroups.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Your vtk.be programme is not linked to a master here yet.
          </p>
        )}
      </fieldset>
      <fieldset className="space-y-3" disabled={yearsDisabled}>
        <legend className="text-sm font-medium mb-2">Which year are you in?</legend>
        <OptionGrid
          idPrefix="year"
          options={YEAR_OPTIONS}
          selected={years}
          disabled={yearsDisabled}
          onChange={onYearsChange}
        />
      </fieldset>
    </div>
  );
}
