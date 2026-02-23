// lib/universities.ts
// List of Dutch and Belgian universities

export const UNIVERSITIES = [
  // Belgium
  "KU Leuven (KUL)",
  "Universiteit Gent (UGent)",
  "Universiteit Antwerpen (UAntwerpen)",
  "Vrije Universiteit Brussel (VUB)",
  "Université Libre de Bruxelles (ULB)",
  "Universiteit Hasselt (UHasselt)",
  "UCLouvain (Université catholique de Louvain)",
  "Technische Universiteit Delft (TU Delft)",
  "Other",
] as const;

export type University = typeof UNIVERSITIES[number];

