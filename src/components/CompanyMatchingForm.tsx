"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { IconCheck, IconRefresh, IconUsers, IconList } from "@tabler/icons-react";
import {
  getCompanyMatchingResponseForCompanyViewAction,
  saveCompanyMatchingResponseAction,
} from "@/app/actions/matching-software";
import { getStudentFormResponseDataForEventAction } from "@/app/actions/forms";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GENERAL_INFO_WORK_PREFERENCE_OPTIONS,
  GENERAL_INFO_COMPANY_TYPE_OPTIONS,
  GENERAL_INFO_WORK_OPTIONS,
  type GeneralInfoAnswers,
} from "@/lib/matching-general-info";
import { cn } from "@/lib/utils";
import { getScanningDisplayValues, hasScanningColumns } from "@/lib/utils/scanning-columns";

type MatchedStudent = { id: string; first_name: string | null; last_name: string | null; email: string };

type Question = {
  id: number;
  question: string;
  options: { label: string; value: string; culture: "Clan" | "Adhocracy" | "Market" | "Hierarchy" }[];
};

// Option order per question follows the specified display order (random order); value A/B/C/D = 1st/2nd/3rd/4th shown.
const QUESTIONS: Question[] = [
  { id: 1, question: "How would you describe your company's general work environment?", options: [
    { label: "A dynamic, fast-changing environment.", value: "A", culture: "Adhocracy" },
    { label: "A close-knit, supportive workplace.", value: "B", culture: "Clan" },
    { label: "A structured, formal, and organized setting.", value: "C", culture: "Hierarchy" },
    { label: "An outcome-driven, performance-oriented atmosphere.", value: "D", culture: "Market" },
  ]},
  { id: 2, question: "What type of leadership style is most common in your company?", options: [
    { label: "Coordinators and administrators.", value: "A", culture: "Hierarchy" },
    { label: "Visionary and risk-taking leaders.", value: "B", culture: "Adhocracy" },
    { label: "Mentoring and supportive leaders.", value: "C", culture: "Clan" },
    { label: "Hard-driving and results-oriented leaders.", value: "D", culture: "Market" },
  ]},
  { id: 3, question: "What is most valued when evaluating employee success?", options: [
    { label: "Creativity and innovation.", value: "A", culture: "Adhocracy" },
    { label: "Following procedures and maintaining stability.", value: "B", culture: "Hierarchy" },
    { label: "Achievement of measurable goals.", value: "C", culture: "Market" },
    { label: "Teamwork and employee engagement.", value: "D", culture: "Clan" },
  ]},
  { id: 4, question: "What best describes internal communication?", options: [
    { label: "Spontaneous and idea-driven.", value: "A", culture: "Adhocracy" },
    { label: "Open, inclusive, and informal.", value: "B", culture: "Clan" },
    { label: "Direct, performance-focused.", value: "C", culture: "Market" },
    { label: "Formal and standardized.", value: "D", culture: "Hierarchy" },
  ]},
  { id: 5, question: "How is conflict usually handled?", options: [
    { label: "Through open discussion and mediation.", value: "A", culture: "Clan" },
    { label: "By adapting quickly and moving forward.", value: "B", culture: "Adhocracy" },
    { label: "By focusing on outcomes and accountability.", value: "C", culture: "Market" },
    { label: "By following formal processes.", value: "D", culture: "Hierarchy" },
  ]},
  { id: 6, question: "What is most emphasized in onboarding?", options: [
    { label: "Building relationships and connection.", value: "A", culture: "Clan" },
    { label: "Embracing creativity and initiative.", value: "B", culture: "Adhocracy" },
    { label: "Understanding expectations and performance metrics.", value: "C", culture: "Market" },
    { label: "Learning systems, rules, and procedures.", value: "D", culture: "Hierarchy" },
  ]},
  { id: 7, question: "What qualities do you most look for when hiring?", options: [
    { label: "Collaboration and cultural fit.", value: "A", culture: "Clan" },
    { label: "Adaptability and entrepreneurial spirit.", value: "B", culture: "Adhocracy" },
    { label: "Personal drive, tenacity, and a will to win.", value: "C", culture: "Market" },
    { label: "Reliability and attention to detail.", value: "D", culture: "Hierarchy" },
  ]},
  { id: 8, question: "How would you describe career progression?", options: [
    { label: "Based on teamwork and contribution to the group.", value: "A", culture: "Clan" },
    { label: "Rapid for those who innovate and take risks.", value: "B", culture: "Adhocracy" },
    { label: "Based on measurable performance indicators.", value: "C", culture: "Market" },
    { label: "Formalized and structured through clear paths.", value: "D", culture: "Hierarchy" },
  ]},
  { id: 9, question: "What type of rewards are most common?", options: [
    { label: "Recognition for teamwork and loyalty.", value: "A", culture: "Clan" },
    { label: "Rewards for innovation and new ideas.", value: "B", culture: "Adhocracy" },
    { label: "Bonuses tied to performance metrics.", value: "C", culture: "Market" },
    { label: "Rewards for consistency and long-term reliability.", value: "D", culture: "Hierarchy" },
  ]},
  { id: 10, question: "How would you describe your company's pace of work?", options: [
    { label: "Steady and people-centered.", value: "A", culture: "Clan" },
    { label: "Rapid, changing, and experimental.", value: "B", culture: "Adhocracy" },
    { label: "Intense, demanding, and result-focused.", value: "C", culture: "Market" },
    { label: "Predictable and controlled.", value: "D", culture: "Hierarchy" },
  ]},
  { id: 11, question: "What is the company's approach to risk?", options: [
    { label: "Risk is taken carefully with team input.", value: "A", culture: "Clan" },
    { label: "Risk-taking is encouraged and embraced.", value: "B", culture: "Adhocracy" },
    { label: "Risk is acceptable if it leads to measurable success.", value: "C", culture: "Market" },
    { label: "Risk is minimized through rules and planning.", value: "D", culture: "Hierarchy" },
  ]},
  { id: 12, question: "What is most celebrated inside the company?", options: [
    { label: "Strong teamwork and collaboration.", value: "A", culture: "Clan" },
    { label: "Breakthrough ideas and creative projects.", value: "B", culture: "Adhocracy" },
    { label: "Hitting targets and winning deals.", value: "C", culture: "Market" },
    { label: "Process improvements and ensuring compliance.", value: "D", culture: "Hierarchy" },
  ]},
  { id: 13, question: "What describes relationships between teams?", options: [
    { label: "Supportive and cooperative.", value: "A", culture: "Clan" },
    { label: "Flexible and spontaneous collaborations.", value: "B", culture: "Adhocracy" },
    { label: "Achievement-based or performance-driven.", value: "C", culture: "Market" },
    { label: "Clearly defined responsibilities and roles.", value: "D", culture: "Hierarchy" },
  ]},
];

function seededShuffle<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  let currentSeed = seed;
  function seededRandom() {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  }
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Random order per question (seeded by question id so it’s consistent for save/load). */
function getOptions(question: Question) {
  const seed = question.id * 7919 + 31;
  return seededShuffle(question.options, seed);
}

function calculateCulturePercentages(answers: Record<string, string>): Record<string, number> {
  const cultureCounts: Record<string, number> = { Clan: 0, Adhocracy: 0, Market: 0, Hierarchy: 0 };
  const totalQuestions = QUESTIONS.length;
  const POSITION_LETTERS = "ABCD";
  Object.entries(answers).forEach(([questionId, answerValue]) => {
    const question = QUESTIONS.find((q) => q.id === parseInt(questionId));
    if (question) {
      const options = getOptions(question);
      const idx = POSITION_LETTERS.indexOf(answerValue);
      if (idx >= 0 && options[idx]) cultureCounts[options[idx].culture]++;
    }
  });
  return {
    Clan: Math.round((cultureCounts.Clan / totalQuestions) * 100 * 100) / 100,
    Adhocracy: Math.round((cultureCounts.Adhocracy / totalQuestions) * 100 * 100) / 100,
    Market: Math.round((cultureCounts.Market / totalQuestions) * 100 * 100) / 100,
    Hierarchy: Math.round((cultureCounts.Hierarchy / totalQuestions) * 100 * 100) / 100,
  };
}

function normalizeStudents(raw: unknown): MatchedStudent[] {
  if (!raw) return [];
  let arr: unknown[] = [];
  if (Array.isArray(raw)) arr = raw;
  else if (typeof raw === "object" && raw !== null && "data" in raw && Array.isArray((raw as { data: unknown }).data)) {
    arr = (raw as { data: unknown[] }).data;
  } else return [];
  return arr
    .map((item): MatchedStudent | null => {
      if (item == null) return null;
      if (typeof item === "string") return { id: item, first_name: null, last_name: null, email: "" };
      if (typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id : typeof o.id === "number" ? String(o.id) : null;
      if (!id) return null;
      const first_name = o.first_name != null ? String(o.first_name) : null;
      const last_name = o.last_name != null ? String(o.last_name) : null;
      const email = typeof o.email === "string" ? o.email : "";
      return { id, first_name, last_name, email };
    })
    .filter((s): s is MatchedStudent => s !== null);
}

type Props = {
  companyId: string;
  matchingSoftwareId: string;
  eventId?: string;
  eventName?: string;
  companiesCanViewMatches?: boolean;
};

export function CompanyMatchingForm({ companyId, matchingSoftwareId, eventId, eventName, companiesCanViewMatches = false }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generalInfo, setGeneralInfo] = useState<GeneralInfoAnswers>({
    work_preference: [],
    company_type: [],
    work_options: [],
  });
  const [savedSnapshot, setSavedSnapshot] = useState<Record<string, string> | null>(null);
  const [savedGeneralInfoSnapshot, setSavedGeneralInfoSnapshot] = useState<GeneralInfoAnswers | null>(null);
  const [students, setStudents] = useState<MatchedStudent[]>([]);
  const [studentFormData, setStudentFormData] = useState<Map<string, { data: Record<string, unknown>; scanning_columns?: { university?: string; faculty?: string; master?: string; year_of_study?: string } }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"questions" | "matches">("questions");

  async function loadResponse() {
    const existing = await getCompanyMatchingResponseForCompanyViewAction(companyId, matchingSoftwareId);
    if (existing) {
      const existingAnswers = existing.ocia_answers ? { ...existing.ocia_answers } : {};
      setAnswers(existingAnswers);
      setSavedSnapshot(existingAnswers);
      const gi = (existing as { general_info_answers?: GeneralInfoAnswers })?.general_info_answers ?? {
        work_preference: [],
        company_type: [],
        work_options: [],
      };
      setGeneralInfo(gi);
      setSavedGeneralInfoSnapshot(gi);
      const rawStudents = (existing as { students?: unknown }).students;
      const normalized = normalizeStudents(rawStudents);
      setStudents(normalized);
      if (eventId && normalized.length > 0) {
        getStudentFormResponseDataForEventAction(eventId, normalized.map((s) => s.id))
          .then(setStudentFormData)
          .catch(console.error);
      } else {
        setStudentFormData(new Map());
      }
      // Default to Matches tab when company has access and has completed questions
      if (companiesCanViewMatches && existingAnswers && Object.keys(existingAnswers).length >= 13) {
        setActiveTab("matches");
      }
    }
    return existing;
  }

  useEffect(() => {
    loadResponse().catch(console.error).finally(() => setLoading(false));
  }, [companyId, matchingSoftwareId, eventId]);

  const hasCompletedQuestions = savedSnapshot && Object.keys(savedSnapshot).length >= 13;

  const isDirty = useMemo(() => {
    if (!savedSnapshot) return false;
    const answersDirty = JSON.stringify(answers) !== JSON.stringify(savedSnapshot);
    const generalInfoDirty = savedGeneralInfoSnapshot
      ? JSON.stringify(generalInfo) !== JSON.stringify(savedGeneralInfoSnapshot)
      : false;
    return answersDirty || generalInfoDirty;
  }, [answers, savedSnapshot, generalInfo, savedGeneralInfoSnapshot]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ocia = calculateCulturePercentages(answers);
    try {
      await saveCompanyMatchingResponseAction(companyId, matchingSoftwareId, answers, ocia, generalInfo);
      setSavedSnapshot({ ...answers });
      setSavedGeneralInfoSnapshot({ ...generalInfo });
      setShowSuccessDialog(true);
    } catch (err) {
      console.error("[CompanyMatchingForm] Error saving:", err);
      alert("Failed to save matching information. Please try again.");
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  return (
    <>
    <Card className="rounded-2xl shadow-md">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Matching Software{eventName ? ` – ${eventName}` : ""}</CardTitle>
            <CardDescription>
              Complete these questions to refine your student matches. Your preferred student study programs (e.g. Mechanical Engineering, Electrical Engineering,…) are already synced from your{" "}
              <Link href="/dashboard/settings/information" className="underline font-medium text-foreground hover:no-underline">
                Settings → Company Information
              </Link>
              {" "}and can be adjusted there at any time.
            </CardDescription>
          </div>
          {hasCompletedQuestions && (
            <div className="flex rounded-lg border border-border bg-muted/30 p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("questions")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  activeTab === "questions"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <IconList size={16} /> Questions
              </button>
              {companiesCanViewMatches && (
                <button
                  type="button"
                  onClick={() => setActiveTab("matches")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    activeTab === "matches"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <IconUsers size={16} /> {students.length > 0 ? `View matches (${students.length})` : "Matches"}
                </button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {hasCompletedQuestions && companiesCanViewMatches && activeTab === "matches" ? (
          <div className="space-y-6">
            {eventName && (
              <p className="text-sm font-medium text-muted-foreground">
                Matching software: {eventName}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Students who matched with your company. An admin can update matches for all companies from the admin matching software page.
            </p>
            {students.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <IconUsers className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No matches yet. An admin can run &quot;Update matches&quot; to sync student matches.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {students.map((s) => {
                    const formEntry = studentFormData.get(s.id);
                    const scanCols = formEntry
                      ? getScanningDisplayValues(formEntry.data, formEntry.scanning_columns)
                      : { university: "", faculty: "", master: "", yearOfStudy: "" };
                    const hasScanCols = formEntry && hasScanningColumns(formEntry.scanning_columns) &&
                      (scanCols.university || scanCols.faculty || scanCols.master || scanCols.yearOfStudy);

                    // Name: from students collection, or form data (_student_full_name) as fallback
                    const displayName = [s.first_name, s.last_name].filter(Boolean).join(" ") ||
                      (formEntry?.data?._student_full_name as string) || "—";
                    // Email: from students collection, or form data (email / _student_email) as fallback
                    const displayEmail = s.email ||
                      (formEntry?.data?.email as string) ||
                      (formEntry?.data?._student_email as string) ||
                      "";

                    return (
                      <div
                        key={s.id}
                        className="flex min-h-[180px] flex-col rounded-lg border border-border bg-card p-4 shadow-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground">
                            {displayName}
                          </p>
                          {displayEmail ? (
                            <a
                              href={`mailto:${displayEmail}`}
                              className="text-sm text-muted-foreground hover:text-foreground hover:underline break-all"
                            >
                              {displayEmail}
                            </a>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </div>
                        {hasScanCols && (
                          <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                            {scanCols.university && <p><span className="font-medium text-foreground/80">University:</span> {scanCols.university}</p>}
                            {scanCols.faculty && <p><span className="font-medium text-foreground/80">Faculty:</span> {scanCols.faculty}</p>}
                            {scanCols.master && <p><span className="font-medium text-foreground/80">Master:</span> {scanCols.master}</p>}
                            {scanCols.yearOfStudy && <p><span className="font-medium text-foreground/80">Year:</span> {scanCols.yearOfStudy}</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          {QUESTIONS.map((question) => {
            const options = getOptions(question);
            const questionKey = question.id.toString();
            const currentValue = answers[questionKey] || "";
            return (
              <div key={question.id} className="space-y-4 border-b pb-6 last:border-b-0">
                <Label className="text-base font-semibold">{question.id}. {question.question}</Label>
                <RadioGroup value={currentValue} onValueChange={(v) => setAnswers((p) => ({ ...p, [questionKey]: v }))}>
                  {options.map((option, idx) => {
                    const positionLetter = "ABCD"[idx];
                    return (
                      <div key={positionLetter} className="flex items-center space-x-2">
                        <RadioGroupItem value={positionLetter} id={`q${question.id}-${positionLetter}`} name={`question-${question.id}`} />
                        <Label htmlFor={`q${question.id}-${positionLetter}`} className="font-normal cursor-pointer flex-1">{option.label}</Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>
            );
          })}
          <div className="space-y-6 pt-6 border-t">
            <h3 className="text-lg font-semibold">General info</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Engineers at our company work...</Label>
                <div className="mt-2 space-y-2 flex flex-col">
                  {GENERAL_INFO_WORK_PREFERENCE_OPTIONS.map((opt) => (
                    <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={(generalInfo.work_preference ?? []).includes(opt.key)}
                        onCheckedChange={(checked) => {
                          setGeneralInfo((prev) => ({
                            ...prev,
                            work_preference: checked
                              ? [...(prev.work_preference ?? []), opt.key]
                              : (prev.work_preference ?? []).filter((k) => k !== opt.key),
                          }));
                        }}
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-base font-medium">...while they...</Label>
                <div className="mt-2 space-y-2 flex flex-col">
                  {GENERAL_INFO_WORK_OPTIONS.map((opt) => (
                    <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={(generalInfo.work_options ?? []).includes(opt.key)}
                        onCheckedChange={(checked) => {
                          setGeneralInfo((prev) => ({
                            ...prev,
                            work_options: checked
                              ? [...(prev.work_options ?? []), opt.key]
                              : (prev.work_options ?? []).filter((k) => k !== opt.key),
                          }));
                        }}
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-base font-medium">Company type</Label>
                <div className="mt-2 space-y-2 flex flex-col">
                  {GENERAL_INFO_COMPANY_TYPE_OPTIONS.map((opt) => (
                    <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={(generalInfo.company_type ?? []).includes(opt.key)}
                        onCheckedChange={(checked) => {
                          setGeneralInfo((prev) => ({
                            ...prev,
                            company_type: checked
                              ? [...(prev.company_type ?? []), opt.key]
                              : (prev.company_type ?? []).filter((k) => k !== opt.key),
                          }));
                        }}
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <Button type="submit" className={`flex items-center gap-2 cursor-pointer ${!isDirty ? "bg-green-600 text-white disabled:bg-green-600 disabled:text-white" : ""}`} disabled={!isDirty}>
              <IconCheck size={18} /> {!isDirty ? "Saved" : "Save Answers"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => { savedSnapshot && setAnswers({ ...savedSnapshot }); savedGeneralInfoSnapshot && setGeneralInfo({ ...savedGeneralInfoSnapshot }); }} className="cursor-pointer" disabled={!isDirty}>
              <IconRefresh size={18} /> Reset
            </Button>
          </div>
        </form>
        )}
      </CardContent>
    </Card>

    <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Matching Software Completed</DialogTitle>
          <DialogDescription>
            You&apos;ve successfully filled in the matching software. Your answers have been saved and will be used for student matching.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setShowSuccessDialog(false)}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
