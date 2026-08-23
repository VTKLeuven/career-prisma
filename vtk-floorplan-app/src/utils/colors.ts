export const CATEGORY_COLORS: Record<number, string> = {
  1: '#2563EB', // Blue (Computerwetenschappen)
  2: '#0EA5E9', // Sky (Artificiële Intelligentie)
  3: '#4F46E5', // Indigo (Wiskundige Ingenieurstechnieken)
  4: '#DC2626', // Red (Elektrotechniek)
  5: '#EA580C', // Orange (Nanowetenschappen & Nanotechnologie)
  6: '#D97706', // Amber (Energie)
  7: '#7C3AED', // Violet (Werktuigkunde)
  8: '#DB2777', // Pink (Materiaalkunde)
  9: '#E11D48', // Rose (Chemische Technologie)
  10: '#10B981', // Emerald (Biomedische Technologie)
  11: '#0D9488', // Teal (Bouwkunde)
  12: '#475569', // Slate (Architectuur)
  13: '#65A30D', // Lime (Management, Science & Engineering)
  14: '#92400E', // Brown (Andere richtingen)
};

const DEFAULT_CATEGORY_COLOR = '#FFC933'; // VTK Yellow

export const getCategoryColor = (categoryId: number | null | undefined): string => {
  if (categoryId == null) return DEFAULT_CATEGORY_COLOR;
  return CATEGORY_COLORS[categoryId] || DEFAULT_CATEGORY_COLOR;
};
