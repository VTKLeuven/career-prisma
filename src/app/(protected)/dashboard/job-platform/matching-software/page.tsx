"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { IconCheck, IconRefresh } from "@tabler/icons-react";
import type { Company } from "@/lib/schema";
import { updateCompanyAction, fetchCompanyByIdAction } from "@/app/actions/companies";
import { useUser } from "@/providers/UserProvider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Question data structure
type Question = {
  id: number;
  question: string;
  options: {
    label: string;
    value: string;
    culture: "Clan" | "Adhocracy" | "Market" | "Hierarchy";
  }[];
};

const QUESTIONS: Question[] = [
  {
    id: 1,
    question: "How would you describe your company's general work environment?",
    options: [
      { label: "A close-knit, supportive workplace.", value: "A", culture: "Clan" },
      { label: "A dynamic, fast-changing environment.", value: "B", culture: "Adhocracy" },
      { label: "A competitive, performance-oriented atmosphere.", value: "C", culture: "Market" },
      { label: "A structured, formal, and organized setting.", value: "D", culture: "Hierarchy" },
    ],
  },
  {
    id: 2,
    question: "What type of leadership style is most common in your company?",
    options: [
      { label: "Mentoring and supportive leaders.", value: "A", culture: "Clan" },
      { label: "Visionary and risk-taking leaders.", value: "B", culture: "Adhocracy" },
      { label: "Hard-driving and results-oriented leaders.", value: "C", culture: "Market" },
      { label: "Coordinators and administrators.", value: "D", culture: "Hierarchy" },
    ],
  },
  {
    id: 3,
    question: "What is most valued when evaluating employee success?",
    options: [
      { label: "Teamwork and employee engagement.", value: "A", culture: "Clan" },
      { label: "Creativity and innovation.", value: "B", culture: "Adhocracy" },
      { label: "Achievement of measurable goals.", value: "C", culture: "Market" },
      { label: "Following procedures and maintaining stability.", value: "D", culture: "Hierarchy" },
    ],
  },
  {
    id: 4,
    question: "What best describes internal communication?",
    options: [
      { label: "Open, inclusive, and informal.", value: "A", culture: "Clan" },
      { label: "Spontaneous and idea-driven.", value: "B", culture: "Adhocracy" },
      { label: "Direct, performance-focused.", value: "C", culture: "Market" },
      { label: "Formal and standardized.", value: "D", culture: "Hierarchy" },
    ],
  },
  {
    id: 5,
    question: "How is conflict usually handled?",
    options: [
      { label: "Through open discussion and mediation.", value: "A", culture: "Clan" },
      { label: "By adapting quickly and moving forward.", value: "B", culture: "Adhocracy" },
      { label: "By focusing on outcomes and accountability.", value: "C", culture: "Market" },
      { label: "By following formal processes.", value: "D", culture: "Hierarchy" },
    ],
  },
  {
    id: 6,
    question: "What is most emphasized in onboarding?",
    options: [
      { label: "Building relationships and connection.", value: "A", culture: "Clan" },
      { label: "Embracing creativity and initiative.", value: "B", culture: "Adhocracy" },
      { label: "Understanding expectations and performance metrics.", value: "C", culture: "Market" },
      { label: "Learning systems, rules, and procedures.", value: "D", culture: "Hierarchy" },
    ],
  },
  {
    id: 7,
    question: "What qualities do you most look for when hiring?",
    options: [
      { label: "Collaboration and cultural fit.", value: "A", culture: "Clan" },
      { label: "Adaptability and entrepreneurial spirit.", value: "B", culture: "Adhocracy" },
      { label: "Drive, ambition, and competitiveness.", value: "C", culture: "Market" },
      { label: "Reliability and attention to detail.", value: "D", culture: "Hierarchy" },
    ],
  },
  {
    id: 8,
    question: "How would you describe career progression?",
    options: [
      { label: "Based on teamwork and contribution to the group.", value: "A", culture: "Clan" },
      { label: "Rapid for those who innovate and take risks.", value: "B", culture: "Adhocracy" },
      { label: "Based on measurable performance indicators.", value: "C", culture: "Market" },
      { label: "Formalized and structured through clear paths.", value: "D", culture: "Hierarchy" },
    ],
  },
  {
    id: 9,
    question: "What type of rewards are most common?",
    options: [
      { label: "Recognition for teamwork and loyalty.", value: "A", culture: "Clan" },
      { label: "Rewards for innovation and new ideas.", value: "B", culture: "Adhocracy" },
      { label: "Bonuses tied to performance metrics.", value: "C", culture: "Market" },
      { label: "Rewards for consistency and long-term reliability.", value: "D", culture: "Hierarchy" },
    ],
  },
  {
    id: 10,
    question: "How would you describe your company's pace of work?",
    options: [
      { label: "Steady and people-centered.", value: "A", culture: "Clan" },
      { label: "Rapid, changing, and experimental.", value: "B", culture: "Adhocracy" },
      { label: "Fast, demanding, and competitive.", value: "C", culture: "Market" },
      { label: "Predictable and controlled.", value: "D", culture: "Hierarchy" },
    ],
  },
  {
    id: 11,
    question: "What is the company's approach to risk?",
    options: [
      { label: "Risk is taken carefully with team input.", value: "A", culture: "Clan" },
      { label: "Risk-taking is encouraged and embraced.", value: "B", culture: "Adhocracy" },
      { label: "Risk is acceptable if it leads to measurable success.", value: "C", culture: "Market" },
      { label: "Risk is minimized through rules and planning.", value: "D", culture: "Hierarchy" },
    ],
  },
  {
    id: 12,
    question: "What is most celebrated inside the company?",
    options: [
      { label: "Strong teamwork and collaboration.", value: "A", culture: "Clan" },
      { label: "Breakthrough ideas and creative projects.", value: "B", culture: "Adhocracy" },
      { label: "Hitting targets and winning deals.", value: "C", culture: "Market" },
      { label: "Process improvements and ensuring compliance.", value: "D", culture: "Hierarchy" },
    ],
  },
  {
    id: 13,
    question: "What describes relationships between teams?",
    options: [
      { label: "Supportive and cooperative.", value: "A", culture: "Clan" },
      { label: "Flexible and spontaneous collaborations.", value: "B", culture: "Adhocracy" },
      { label: "Competitive or performance-driven.", value: "C", culture: "Market" },
      { label: "Clearly defined responsibilities and roles.", value: "D", culture: "Hierarchy" },
    ],
  },
];

// Shuffle array using Fisher-Yates algorithm with a seed for deterministic randomization
function seededShuffle<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  let currentSeed = seed;
  
  // Simple seeded random number generator
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

// Get randomized options for a question (deterministic based on question ID)
function getRandomizedOptions(question: Question) {
  // Use question ID as seed for deterministic randomization
  // This ensures the same question always has the same order, but different questions have different orders
  return seededShuffle(question.options, question.id);
}

// Calculate culture percentages based on answers
// Percentages are calculated as: (number of questions with that culture type) / 13
function calculateCulturePercentages(answers: Record<string, string>): Record<string, number> {
  const cultureCounts: Record<string, number> = {
    Clan: 0,
    Adhocracy: 0,
    Market: 0,
    Hierarchy: 0,
  };

  const totalQuestions = QUESTIONS.length; // Always 13

  // Count culture types from answers
  Object.entries(answers).forEach(([questionId, answerValue]) => {
    const question = QUESTIONS.find((q) => q.id === parseInt(questionId));
    if (question) {
      const selectedOption = question.options.find((opt) => opt.value === answerValue);
      if (selectedOption) {
        cultureCounts[selectedOption.culture]++;
      }
    }
  });

  // Calculate percentages as (count / 13) * 100
  // Round to 2 decimal places
  return {
    Clan: Math.round((cultureCounts.Clan / totalQuestions) * 100 * 100) / 100,
    Adhocracy: Math.round((cultureCounts.Adhocracy / totalQuestions) * 100 * 100) / 100,
    Market: Math.round((cultureCounts.Market / totalQuestions) * 100 * 100) / 100,
    Hierarchy: Math.round((cultureCounts.Hierarchy / totalQuestions) * 100 * 100) / 100,
  };
}

export default function MatchingSoftwarePage() {
  const { user } = useUser();
  const [company, setCompany] = useState<Company | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [savedSnapshot, setSavedSnapshot] = useState<{
    matching_information: Record<string, string> | null;
  } | null>(null);

  // Load company and existing answers
  useEffect(() => {
    async function loadCompany() {
      if (!user?.company) {
        console.log("[MatchingSoftware] No user company");
        return;
      }
      try {
        console.log("[MatchingSoftware] Fetching company:", user.company.id);
        const fetchedCompany = await fetchCompanyByIdAction(user.company.id);
        console.log("[MatchingSoftware] Fetched company:", fetchedCompany);
        
        if (fetchedCompany) {
          setCompany(fetchedCompany);
          // Load existing answers from matching_information
          // Handle both object and string (JSON) formats
          let existingAnswers: Record<string, string> = {};
          
          console.log("[MatchingSoftware] matching_information raw:", fetchedCompany.matching_information);
          console.log("[MatchingSoftware] matching_information type:", typeof fetchedCompany.matching_information);
          
          if (fetchedCompany.matching_information) {
            if (typeof fetchedCompany.matching_information === 'string') {
              try {
                existingAnswers = JSON.parse(fetchedCompany.matching_information);
                console.log("[MatchingSoftware] Parsed from string:", existingAnswers);
              } catch (e) {
                console.error("[MatchingSoftware] Error parsing matching_information:", e);
                existingAnswers = {};
              }
            } else if (typeof fetchedCompany.matching_information === 'object' && fetchedCompany.matching_information !== null) {
              // Handle both plain objects and arrays
              if (Array.isArray(fetchedCompany.matching_information)) {
                // If it's an array, convert to object (shouldn't happen, but handle it)
                console.warn("[MatchingSoftware] matching_information is an array, converting to object");
                existingAnswers = {};
              } else {
                // Convert all keys to strings to ensure consistency
                const rawAnswers = fetchedCompany.matching_information as Record<string | number, string>;
                existingAnswers = {};
                Object.entries(rawAnswers).forEach(([key, value]) => {
                  existingAnswers[String(key)] = value;
                });
                console.log("[MatchingSoftware] Using object directly (keys converted to strings):", existingAnswers);
              }
            }
          } else {
            console.log("[MatchingSoftware] No matching_information found");
          }
          
          console.log("[MatchingSoftware] Final existingAnswers:", existingAnswers);
          console.log("[MatchingSoftware] Sample access test - answers['1']:", existingAnswers['1']);
          setAnswers(existingAnswers);
          setSavedSnapshot({
            matching_information: existingAnswers,
          });
        } else {
          console.log("[MatchingSoftware] No company found");
        }
      } catch (err) {
        console.error("[MatchingSoftware] Error fetching company:", err);
      }
    }
    loadCompany();
  }, [user?.company]);

  // Update answer for a question
  function updateAnswer(questionId: number, answerValue: string) {
    console.log("[MatchingSoftware] Updating answer for question", questionId, "to", answerValue);
    setAnswers((prev) => {
      const updated = {
        ...prev,
        [questionId.toString()]: answerValue,
      };
      console.log("[MatchingSoftware] Updated answers state:", updated);
      return updated;
    });
  }

  // Dirty check - compare current answers with saved snapshot
  const isDirty = useMemo(() => {
    if (!savedSnapshot) return false;
    return JSON.stringify(answers) !== JSON.stringify(savedSnapshot.matching_information);
  }, [answers, savedSnapshot]);

  // Submit form
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company) {
      console.log("[MatchingSoftware] No company, cannot save");
      return;
    }

    console.log("[MatchingSoftware] Submitting answers:", answers);
    
    // Calculate culture percentages
    const culturePercentages = calculateCulturePercentages(answers);
    console.log("[MatchingSoftware] Calculated culture percentages:", culturePercentages);

    // Prepare payload - ensure JSON fields are properly formatted
    // Directus JSON fields can accept objects directly, but we'll ensure they're properly formatted
    const payload: any = {
      matching_information: answers,
      culture: culturePercentages,
    };

    console.log("[MatchingSoftware] Payload to save:", JSON.stringify(payload, null, 2));

    try {
      const updated = await updateCompanyAction(company.id, payload);
      console.log("[MatchingSoftware] Update response:", updated);
      
      if (updated) {
        console.log("[MatchingSoftware] Updated company matching_information:", updated.matching_information);
        console.log("[MatchingSoftware] Updated company culture:", updated.culture);
        
        setCompany(updated);
        
        // Reload answers from the updated company to ensure consistency
        let reloadedAnswers: Record<string, string> = {};
        if (updated.matching_information) {
          if (typeof updated.matching_information === 'string') {
            try {
              reloadedAnswers = JSON.parse(updated.matching_information);
              console.log("[MatchingSoftware] Reloaded answers from string:", reloadedAnswers);
            } catch (e) {
              console.error("[MatchingSoftware] Error parsing updated matching_information:", e);
              reloadedAnswers = answers; // Fallback to what we just saved
            }
          } else if (typeof updated.matching_information === 'object' && updated.matching_information !== null) {
            // Convert all keys to strings to ensure consistency
            const rawAnswers = updated.matching_information as Record<string | number, string>;
            reloadedAnswers = {};
            Object.entries(rawAnswers).forEach(([key, value]) => {
              reloadedAnswers[String(key)] = value;
            });
            console.log("[MatchingSoftware] Reloaded answers from object (keys converted to strings):", reloadedAnswers);
          }
        } else {
          console.log("[MatchingSoftware] No matching_information in updated company, using current answers");
          reloadedAnswers = answers; // Fallback to what we just saved
        }
        
        console.log("[MatchingSoftware] Setting answers to:", reloadedAnswers);
        setAnswers(reloadedAnswers);
        setSavedSnapshot({
          matching_information: reloadedAnswers,
        });
      } else {
        console.error("[MatchingSoftware] Update returned null/undefined");
      }
    } catch (err) {
      console.error("[MatchingSoftware] Error updating company:", err);
      alert("Failed to save matching information. Please try again.");
    }
  }

  // Reset form
  function handleReset() {
    if (!savedSnapshot) return;
    setAnswers(savedSnapshot.matching_information || {});
  }

  return (
    <div className="w-full gap-4 flex flex-col">
      <Card className="rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Matching Software</CardTitle>
          <CardDescription>
            Answer these questions to help us understand your company culture. Your responses will be used for matching purposes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {QUESTIONS.map((question) => {
              // Get randomized options for this question (deterministic per question ID)
              const randomizedOptions = getRandomizedOptions(question);
              const questionKey = question.id.toString();
              const currentValue = answers[questionKey] || "";
              
              // Debug log for first question only to avoid spam
              if (question.id === 1) {
                console.log("[MatchingSoftware] Rendering question 1:");
                console.log("  - currentValue:", currentValue, "(type:", typeof currentValue, ")");
                console.log("  - questionKey:", questionKey, "(type:", typeof questionKey, ")");
                console.log("  - answers[questionKey]:", answers[questionKey]);
                console.log("  - randomizedOptions:", randomizedOptions.map(o => ({ value: o.value, label: o.label.substring(0, 30) + "..." })));
              }
              
              return (
                <div key={question.id} className="space-y-4 border-b pb-6 last:border-b-0">
                  <Label className="text-base font-semibold">
                    {question.id}. {question.question}
                  </Label>
                  <RadioGroup
                    value={currentValue}
                    onValueChange={(value) => {
                      console.log("[MatchingSoftware] RadioGroup changed for question", question.id, "to value", value);
                      updateAnswer(question.id, value);
                    }}
                  >
                    {randomizedOptions.map((option) => {
                      const isChecked = currentValue === option.value;
                      if (question.id === 1) {
                        console.log(`[MatchingSoftware] Option ${option.value}: isChecked=${isChecked}, currentValue="${currentValue}", option.value="${option.value}"`);
                      }
                      return (
                        <div key={option.value} className="flex items-center space-x-2">
                          <RadioGroupItem 
                            value={option.value} 
                            id={`q${question.id}-${option.value}`}
                            name={`question-${question.id}`}
                            key={option.value}
                          />
                          <Label
                            htmlFor={`q${question.id}-${option.value}`}
                            className="font-normal cursor-pointer flex-1"
                          >
                            {option.label}
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>
              );
            })}

            {/* Submit / Reset */}
            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="submit"
                className={`flex items-center gap-2 cursor-pointer ${
                  !isDirty ? "bg-green-600 text-white disabled:bg-green-600 disabled:text-white" : ""
                }`}
                disabled={!isDirty}
              >
                <IconCheck size={18} /> {!isDirty ? "Saved" : "Save Answers"}
              </Button>
              <Button type="button" variant="ghost" onClick={handleReset} className="cursor-pointer" disabled={!isDirty}>
                <IconRefresh size={18} /> Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

