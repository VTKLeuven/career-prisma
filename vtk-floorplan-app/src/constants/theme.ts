/**
 * VTK Career Mobile Floorplan App — Design System & Theme Tokens
 *
 * Design rules enforced here:
 *  - One type family (Inter), 5 sizes, 3 weights. Hierarchy comes from size +
 *    weight + opacity, never from colour soup.
 *  - 60 / 30 / 10 colour split: 60% neutral canvas, 30% navy structure,
 *    10% yellow accent reserved for "you are here" moments on the map.
 *  - 4/8-point spacing grid. No arbitrary values anywhere in the app.
 *  - Soft, tinted shadows (navy-tinted, never neutral black).
 */

export const COLORS = {
  // Brand
  primary: '#0B3B6F',      // VTK Navy (slightly lifted for better contrast on white)
  primaryDark: '#062647',
  primaryLight: '#1D5D9F',
  accent: '#FFC933',       // VTK Yellow
  accentDark: '#E0A800',

  // Soft brand tints — used for selected pills, badges, subtle fills.
  // (Accent at low opacity for secondary surfaces, per the 10% rule.)
  primarySoft: '#EAF1F9',
  primarySofter: '#F4F8FC',
  accentSoft: '#FFF6DE',

  // Neutral canvas — the 60%
  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceSecondary: '#EEF2F7',
  scrim: 'rgba(6, 38, 71, 0.45)',

  // Text — hierarchy by opacity of one ink colour
  text: '#0F1E2E',
  textMuted: '#5B6B7C',
  textLight: '#94A3B4',
  textInverse: '#FFFFFF',
  textOnPrimary: '#FFFFFF',

  // Lines
  border: '#E3E9F0',
  borderDark: '#C9D4E0',

  // Feedback
  success: '#0F9D6E',
  successSoft: '#E6F6F0',
  warning: '#D97706',
  warningSoft: '#FEF3E2',
  danger: '#DC2626',
  info: '#2563EB',

  // Map canvas
  floorplan: {
    background: '#FFFFFF',
    canvas: '#EDF1F6',
    boothDefaultFill: '#0B3B6F',
    boothDefaultStroke: '#062647',
    boothSelectedStroke: '#FFC933',
    boothDimmedFill: '#B6C4D3',
    boothDimmedOpacity: 0.28,
    boothHighlightFill: '#FFC933',
    boothHighlightText: '#0B3B6F',
    boothEmptyFill: '#CBD6E2',
    boothEmptyStroke: '#B0BECE',
  },
} as const;

/** 4/8-point grid. Every margin, padding and gap in the app comes from here. */
export const SPACING = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
} as const;

/** Soft, navy-tinted shadows. Never a neutral grey drop on a coloured ground. */
export const SHADOWS = {
  xs: {
    shadowColor: '#0B3B6F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  sm: {
    shadowColor: '#0B3B6F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#0B3B6F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  lg: {
    shadowColor: '#062647',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 12,
  },
  accent: {
    shadowColor: '#E0A800',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
} as const;

export const FONTS = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const TYPOGRAPHY = {
  fontSize: {
    caption: 11,
    xs: 12,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    hero: 30,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

/**
 * Ready-made text presets. Import and spread these instead of re-declaring
 * fontSize/fontFamily pairs — that is what keeps the type scale honest.
 */
export const TEXT = {
  display: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
    color: COLORS.text,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: COLORS.text,
  },
  heading: {
    fontFamily: FONTS.semibold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: COLORS.text,
  },
  body: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.text,
  },
  bodyMuted: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textMuted,
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textMuted,
  },
  labelStrong: {
    fontFamily: FONTS.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.text,
  },
  caption: {
    fontFamily: FONTS.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    color: COLORS.textLight,
  },
  /** Tabular figures for stand numbers / counts. */
  numeric: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    lineHeight: 18,
    fontVariant: ['tabular-nums'] as const,
    color: COLORS.text,
  },
} as const;

/** Minimum accessible tap target (iOS HIG / Material). */
export const HIT_TARGET = 44;

/** Shared spring config so every transition in the app feels like one system. */
export const MOTION = {
  spring: { damping: 18, stiffness: 180, mass: 0.9 },
  springSnappy: { damping: 20, stiffness: 320, mass: 0.7 },
  timing: { duration: 200 },
  timingFast: { duration: 120 },
} as const;

export const THEME = {
  colors: COLORS,
  spacing: SPACING,
  radius: RADIUS,
  shadows: SHADOWS,
  typography: TYPOGRAPHY,
  fonts: FONTS,
  text: TEXT,
  motion: MOTION,
};

export default THEME;
