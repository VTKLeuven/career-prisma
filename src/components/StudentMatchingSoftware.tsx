"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { slugifyCompanyName, slugifyEventName } from "@/lib/utils/slugify";
import { hasCompanyPageAccess } from "@/lib/utils/company-access";
import { getDirectusImageUrl } from "@/components/Images";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  GENERAL_INFO_WORK_PREFERENCE_OPTIONS,
  GENERAL_INFO_COMPANY_TYPE_OPTIONS,
  GENERAL_INFO_WORK_OPTIONS,
  getGeneralInfoOverlapLabels,
  type GeneralInfoAnswers,
} from "@/lib/matching-general-info";
import {
  getMatchingSoftwareForEventAction,
  getStudentMatchingResponseForCurrentUserAction,
  submitStudentMatchingAction,
  checkStudentPrerequisiteAction,
  recomputeCompanyMatchesForCurrentUserAction,
  fetchMatchedCompaniesForResponseAction,
  fetchCompanyGeneralInfoAction,
} from "@/app/actions/matching-software";
import type { RIASECType } from "@/lib/schema";

const RIASEC_DESCRIPTIONS: Record<RIASECType, { title: string; description: string }> = {
  R: {
    title: "Realistic (The Doers)",
    description: "Practical, Physical, and Hands-On. People with high Realistic scores enjoy working with things rather than ideas or people. They are \"doers\" who prefer concrete problems and practical solutions. Key characteristics: Independent, stable, persistent, genuine, and practical.",
  },
  I: {
    title: "Investigative (The Thinkers)",
    description: "Analytical, Intellectual, and Scientific. Investigative individuals are driven by curiosity. They love to observe, learn, analyze, and solve problems. Key characteristics: Analytical, intellectual, curious, precise, and reserved.",
  },
  A: {
    title: "Artistic (The Creators)",
    description: "Creative, Expressive, and Original. Artistic types are the \"creators.\" They value self-expression and imagination. Key characteristics: Imaginative, idealistic, emotional, open-minded, and impulsive.",
  },
  S: {
    title: "Social (The Helpers)",
    description: "Supportive, Empathetic, and Collaborative. Social individuals derive energy from working with others. They are the \"helpers\" who are driven to inform, develop, cure, or enlighten people. Key characteristics: Helpful, friendly, empathetic, patient, and cooperative.",
  },
  E: {
    title: "Enterprising (The Persuaders)",
    description: "Ambitious, Energetic, and Influential. Enterprising types are \"persuaders\" who enjoy leading and speaking. They are interested in influencing others to achieve organizational or personal goals. Key characteristics: Assertive, energetic, confident, ambitious, and sociable.",
  },
  C: {
    title: "Conventional (The Organizers)",
    description: "Detail-Oriented, Structured, and Efficient. Conventional individuals are the \"organizers.\" They thrive on order, precision, and accuracy. Key characteristics: Organized, careful, efficient, conscientious, and rule-following.",
  },
};

const STUDENT_RIASEC_QUESTIONS = [
  { id: 1, q: "When working on a project, what part excites you most?", A: "Figuring out how things work or solving practical problems", B: "Coming up with new ideas or theories" },
  { id: 2, q: "If you had to join a group at school, which would you pick?", A: "A creative club (art, design, drama, writing)", B: "A leadership or event-planning committee" },
  { id: 3, q: "When faced with a challenge, what do you naturally do first?", A: "Analyze the situation logically and look for information", B: "Talk to people involved to understand their perspectives" },
  { id: 4, q: "Which type of activity sounds more appealing?", A: "Building, fixing, or assembling something", B: "Organizing documents, managing schedules, or keeping data neat" },
  { id: 5, q: "When making decisions, you tend to…", A: "Move quickly, take charge, and influence others toward a goal", B: "Follow structured steps and stick to proven methods" },
  { id: 6, q: "What type of environment motivates you the most?", A: "Flexible, free-form, expressive spaces", B: "Organized, predictable, and detail-oriented spaces" },
  { id: 7, q: "Which task sounds more rewarding?", A: "Advising someone and helping them grow", B: "Leading a project and motivating a team" },
  { id: 8, q: "How do you prefer to structure your workload?", A: "With clear rules, checklists, and defined procedures", B: "With freedom to explore ideas and choose your own methods" },
  { id: 9, q: "What type of problem do you enjoy tackling?", A: "A technical issue where you must figure out the mechanism", B: "A complex question that requires research and analysis" },
  { id: 10, q: "How do you prefer to collaborate?", A: "Through discussion, empathy, and group support", B: "Through sharing insights, data, and logical explanations" },
  { id: 11, q: "What kind of task feels most satisfying?", A: "Bringing order to messy information or optimizing a system", B: "Brainstorming new artistic concepts or unconventional ideas" },
  { id: 12, q: "When you picture your ideal job, you imagine…", A: "Helping people directly through guidance, mentorship, or service", B: "Solving intellectual puzzles or discovering new knowledge" },
];

type Props = {
  eventId: string;
  eventName: string;
  studentId: string;
};

export function StudentMatchingSoftware({ eventId, eventName, studentId }: Props) {
  const router = useRouter();
  const [matchingSoftware, setMatchingSoftware] = useState<Awaited<ReturnType<typeof getMatchingSoftwareForEventAction>>>(null);
  const [existingResponse, setExistingResponse] = useState<Awaited<ReturnType<typeof getStudentMatchingResponseForCurrentUserAction>>>(null);
  const [prerequisiteResponse, setPrerequisiteResponse] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generalInfo, setGeneralInfo] = useState<GeneralInfoAnswers>({
    work_preference: [],
    company_preference: [],
    options_preference: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchedCompanies, setMatchedCompanies] = useState<Array<{ id: string; name?: string; logo?: string; page_on_platform?: boolean; status?: string }>>([]);
  const [overlapByCompanyId, setOverlapByCompanyId] = useState<Record<string, string[]>>({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const ms = await getMatchingSoftwareForEventAction(eventId);
        setMatchingSoftware(ms);
        if (!ms) {
          setLoading(false);
          return;
        }

        let resp = await getStudentMatchingResponseForCurrentUserAction(ms.id);
        if (resp) {
          try {
            const refreshed = await recomputeCompanyMatchesForCurrentUserAction(ms.id);
            if (refreshed) resp = refreshed;
          } catch {
            // Non-fatal: continue with existing response
          }
        }
        setExistingResponse(resp);

        if (ms.prerequisite_form) {
          const formId = typeof ms.prerequisite_form === "string" ? ms.prerequisite_form : (ms.prerequisite_form as { id: string }).id;
          const prereq = await checkStudentPrerequisiteAction(studentId, formId);
          if (!prereq) {
            setError("prerequisite");
            setLoading(false);
            return;
          }
          setPrerequisiteResponse(prereq.data);
        }

        if (resp) {
          const studentGi = (resp as { general_info_answers?: GeneralInfoAnswers }).general_info_answers ?? {
            work_preference: [],
            company_preference: [],
            options_preference: [],
          };
          setAnswers(resp.riasec_answers || {});
          setGeneralInfo(studentGi);
          const companies = await fetchMatchedCompaniesForResponseAction(resp.id);
          setMatchedCompanies(companies);
          if (companies.length > 0) {
            const companyGeneralInfo = await fetchCompanyGeneralInfoAction(ms.id, companies.map((c) => c.id));
            const overlaps: Record<string, string[]> = {};
            for (const c of companies) {
              const companyGi = companyGeneralInfo[c.id];
              overlaps[c.id] = companyGi ? getGeneralInfoOverlapLabels(studentGi, companyGi) : [];
            }
            setOverlapByCompanyId(overlaps);
          } else {
            setOverlapByCompanyId({});
          }
        }
      } catch (e) {
        console.error(e);
        setError("load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId, studentId]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!matchingSoftware) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Matching software is not available for this event.</p>
            <Button asChild className="mt-4">
              <Link href={`/event/${slugifyEventName(eventName)}`}>Back to event</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error === "prerequisite") {
    const form = matchingSoftware.prerequisite_form;
    const formSlug = typeof form === "object" && form && "slug" in form ? (form as { slug: string }).slug : "";
    if (formSlug) {
      const returnUrl = `/event/${slugifyEventName(eventName)}/matching-software`;
      router.replace(`/forms/${formSlug}?redirectTo=${encodeURIComponent(returnUrl)}`);
      return (
        <div className="container max-w-2xl mx-auto py-12 px-4 flex items-center justify-center min-h-[40vh]">
          <p className="text-muted-foreground">Redirecting to form...</p>
        </div>
      );
    }
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <Card>
          <CardContent className="py-12 text-center text-destructive">
            Prerequisite form not configured.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error === "load") {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <Card>
          <CardContent className="py-12 text-center text-destructive">
            Failed to load. Please try again.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already filled - show results only
  if (existingResponse) {
    const riasec = (existingResponse.riasec ?? {}) as Record<RIASECType, number>;
    const sorted = (Object.entries(riasec) as [RIASECType, number][]).sort((a, b) => b[1] - a[1]);
    const dominant = sorted[0];

    return (
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Your Matching Results</CardTitle>
            <CardDescription>
              Here are your results.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground italic">
              This is a simplified assessment and is not a perfect representation of your interests. Use it as a starting point for exploration.
            </p>
            {dominant && (
            <div>
              <h3 className="text-xl font-semibold mb-2">Your dominant type: {RIASEC_DESCRIPTIONS[dominant[0]].title}</h3>
              <p className="text-sm text-muted-foreground">{RIASEC_DESCRIPTIONS[dominant[0]].description}</p>
            </div>
            )}
            <div>
              <h3 className="text-xl font-semibold mb-4">Matched companies</h3>
              {matchedCompanies.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {matchedCompanies.map((c) => {
                    const hasPage = hasCompanyPageAccess(c);
                    const logoUrl = c.logo ? getDirectusImageUrl(c.logo) : null;
                    const overlapKeywords = overlapByCompanyId[c.id] ?? [];
                    const cardContent = (
                      <div className="group flex h-[280px] flex-col items-center rounded-xl border border-border/60 bg-card p-4 text-center transition-colors hover:border-vtk-blue/30 hover:bg-muted/30">
                        <div className="flex h-14 shrink-0 items-center justify-center">
                          {logoUrl ? (
                            <Image
                              src={logoUrl}
                              alt=""
                              width={80}
                              height={56}
                              className="max-h-14 object-contain"
                              unoptimized
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">No logo</span>
                          )}
                        </div>
                        <h4 className="mt-2 line-clamp-2 font-semibold text-foreground leading-tight">{c.name ?? "Unknown company"}</h4>
                        {overlapKeywords.length > 0 ? (
                          <div className="mt-3 flex-1">
                            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Why you matched</p>
                            <div className="flex flex-wrap justify-center gap-1.5">
                              {overlapKeywords.map((kw) => (
                                <span key={kw} className="inline-block rounded-md bg-vtk-blue/10 px-2 py-0.5 text-xs text-vtk-blue">
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 flex-1">
                            <p className="text-xs text-muted-foreground">Based on your RIASEC profile and study field</p>
                          </div>
                        )}
                        {hasPage && (
                          <span className="mt-auto shrink-0 pt-3 text-xs text-vtk-blue group-hover:underline">View company page →</span>
                        )}
                      </div>
                    );
                    return (
                      <div key={c.id}>
                        {hasPage ? (
                          <Link href={`/company/${slugifyCompanyName(c.name) || c.id}`} className="block">
                            {cardContent}
                          </Link>
                        ) : (
                          cardContent
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No companies matched yet. Companies may still be filling in the matching software. Check back later.
                </p>
              )}
            </div>
            <Button asChild variant="outline">
              <Link href={`/event/${slugifyEventName(eventName)}`}>Back to event</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form to fill
  const allAnswered = STUDENT_RIASEC_QUESTIONS.every((q) => answers[q.id.toString()]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allAnswered || !matchingSoftware) return;
    setSubmitting(true);
    try {
      const resp = await submitStudentMatchingAction(matchingSoftware.id, answers, prerequisiteResponse || undefined, generalInfo);
      const finalResp = resp ?? (await getStudentMatchingResponseForCurrentUserAction(matchingSoftware.id));
      if (finalResp) {
        setExistingResponse(finalResp);
        const studentGi = (finalResp as { general_info_answers?: GeneralInfoAnswers }).general_info_answers ?? {
          work_preference: [],
          company_preference: [],
          options_preference: [],
        };
        setGeneralInfo(studentGi);
        const companies = await fetchMatchedCompaniesForResponseAction(finalResp.id);
        setMatchedCompanies(companies);
        if (companies.length > 0) {
          const companyGeneralInfo = await fetchCompanyGeneralInfoAction(matchingSoftware.id, companies.map((c) => c.id));
          const overlaps: Record<string, string[]> = {};
          for (const c of companies) {
            const companyGi = companyGeneralInfo[c.id];
            overlaps[c.id] = companyGi ? getGeneralInfoOverlapLabels(studentGi, companyGi) : [];
          }
          setOverlapByCompanyId(overlaps);
        } else {
          setOverlapByCompanyId({});
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Matching Software</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic mb-6">
            This is a simplified assessment and is not a perfect representation of your interests. Use it as a starting point for exploration.
          </p>
          <form onSubmit={handleSubmit} className="space-y-6">
            {STUDENT_RIASEC_QUESTIONS.map((q) => (
              <div key={q.id} className="space-y-2">
                <Label className="text-base font-medium">{q.id}. {q.q}</Label>
                <RadioGroup
                  value={answers[q.id.toString()]}
                  onValueChange={(v) => setAnswers((prev) => ({ ...prev, [q.id.toString()]: v }))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="A" id={`q${q.id}-a`} />
                    <Label htmlFor={`q${q.id}-a`} className="font-normal cursor-pointer">{q.A}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="B" id={`q${q.id}-b`} />
                    <Label htmlFor={`q${q.id}-b`} className="font-normal cursor-pointer">{q.B}</Label>
                  </div>
                </RadioGroup>
              </div>
            ))}
            <div className="space-y-6 pt-4 border-t">
              <h3 className="text-lg font-semibold">General info</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">I prefer working...</Label>
                  <div className="mt-2 space-y-2 flex flex-col">
                    {GENERAL_INFO_WORK_PREFERENCE_OPTIONS.map((opt) => (
                      <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={generalInfo.work_preference.includes(opt.key)}
                          onCheckedChange={(checked) => {
                            setGeneralInfo((prev) => ({
                              ...prev,
                              work_preference: checked
                                ? [...prev.work_preference, opt.key]
                                : prev.work_preference.filter((k) => k !== opt.key),
                            }));
                          }}
                        />
                        <span className="text-sm">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-base font-medium">I prefer working for...</Label>
                  <div className="mt-2 space-y-2 flex flex-col">
                    {GENERAL_INFO_COMPANY_TYPE_OPTIONS.map((opt) => (
                      <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={(generalInfo.company_preference ?? []).includes(opt.key)}
                          onCheckedChange={(checked) => {
                            setGeneralInfo((prev) => ({
                              ...prev,
                              company_preference: checked
                                ? [...(prev.company_preference ?? []), opt.key]
                                : (prev.company_preference ?? []).filter((k) => k !== opt.key),
                            }));
                          }}
                        />
                        <span className="text-sm">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-base font-medium">I would like the option to...</Label>
                  <div className="mt-2 space-y-2 flex flex-col">
                    {GENERAL_INFO_WORK_OPTIONS.map((opt) => (
                      <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={(generalInfo.options_preference ?? []).includes(opt.key)}
                          onCheckedChange={(checked) => {
                            setGeneralInfo((prev) => ({
                              ...prev,
                              options_preference: checked
                                ? [...(prev.options_preference ?? []), opt.key]
                                : (prev.options_preference ?? []).filter((k) => k !== opt.key),
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
            <Button type="submit" disabled={!allAnswered || submitting} className="w-full">
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
