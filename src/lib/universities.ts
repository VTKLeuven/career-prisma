// lib/universities.ts
// List of Dutch and Belgian universities

export const UNIVERSITIES = [
  // Belgium
  "Universiteit Gent",
  "Vrije Universiteit Brussel",
  "Universiteit Antwerpen",
  "Universiteit Hasselt",
  "Other"
] as const;

export type University = typeof UNIVERSITIES[number];

