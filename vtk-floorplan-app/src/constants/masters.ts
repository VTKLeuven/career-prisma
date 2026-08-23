/**
 * The 14 master's programmes companies can target at the VTK Jobfair.
 *
 * Each programme owns one colour. That colour is the whole filter language of
 * the app: pick "Computerwetenschappen" and every stand recruiting CW lights up
 * in CW blue, so the map answers "where do I go?" at a glance instead of
 * requiring 211 taps. Hues are spread across the wheel and paired families are
 * separated by lightness, so no two programmes read as the same colour.
 */

export interface MasterDefinition {
  id: number;
  /** Short code as used by VTK (ESAT, BWK, …). */
  code: string;
  /** Dutch programme name. */
  name: string;
  /** English label, shown as a secondary line. */
  nameEn: string;
  /** Fill used for matching stands on the map and for the active filter pill. */
  color: string;
}

export const MASTERS: MasterDefinition[] = [
  { id: 1, code: 'CW', name: 'Computerwetenschappen', nameEn: 'Computer Science', color: '#2563EB' },
  { id: 2, code: 'AI', name: 'Artificiële Intelligentie', nameEn: 'Artificial Intelligence', color: '#DB2777' },
  { id: 3, code: 'WIT', name: 'Wiskundige Ingenieurstechnieken', nameEn: 'Mathematical Engineering', color: '#0891B2' },
  { id: 4, code: 'ESAT', name: 'Elektrotechniek', nameEn: 'Electrical Engineering', color: '#7C3AED' },
  { id: 5, code: 'NANO', name: 'Nanowetenschappen & Nanotechnologie', nameEn: 'Nanoscience & Nanotechnology', color: '#06B6D4' },
  { id: 6, code: 'ENER', name: 'Energie', nameEn: 'Energy', color: '#F59E0B' },
  { id: 7, code: 'WTK', name: 'Werktuigkunde', nameEn: 'Mechanical Engineering', color: '#C2410C' },
  { id: 8, code: 'MTM', name: 'Materiaalkunde', nameEn: 'Materials Engineering', color: '#65A30D' },
  { id: 9, code: 'CIT', name: 'Chemische Technologie', nameEn: 'Chemical Engineering', color: '#16A34A' },
  { id: 10, code: 'BMT', name: 'Biomedische Technologie', nameEn: 'Biomedical Engineering', color: '#E11D48' },
  { id: 11, code: 'BWK', name: 'Bouwkunde', nameEn: 'Civil Engineering', color: '#0F766E' },
  { id: 12, code: 'ARCH', name: 'Architectuur', nameEn: 'Architecture', color: '#92400E' },
  { id: 13, code: 'MSCE', name: 'Management, Science & Engineering', nameEn: 'Management, Science & Engineering', color: '#A21CAF' },
  { id: 14, code: 'OTHER', name: 'Andere richtingen', nameEn: 'Other programmes', color: '#64748B' },
];

export const MASTERS_BY_ID: Record<number, MasterDefinition> = Object.fromEntries(
  MASTERS.map((m) => [m.id, m])
);

export const MASTERS_BY_CODE: Record<string, MasterDefinition> = Object.fromEntries(
  MASTERS.map((m) => [m.code, m])
);

export function masterColor(id: number | null | undefined, fallback: string): string {
  if (id == null) return fallback;
  return MASTERS_BY_ID[id]?.color ?? fallback;
}

/** `#RRGGBB` + alpha -> `rgba(...)`, for tinted pill backgrounds and glows. */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
