# 🔍 Second Codebase Audit Report (Post-Remediation)

**Generated**: Reviewing the codebase after the first remediation phase against the original `IMPLEMENTATION_PLAN.md` to identify any lingering gaps, missing features, or new inconsistencies.

---

## ✅ Verified Working (Fixed during Phase 1-4)
- **`@gorhom/bottom-sheet`**: Correctly implemented in `CompanyDetailSheet.tsx` with smooth snap points.
- **Reanimated Flicker**: 60fps native thread pulse animation loop works in `BoothNode.tsx`.
- **Gesture Engine**: Double-tap centering and pan boundary clamping operate correctly via `useFloorplanGestures.ts`.
- **Lucide Icons**: Replaced all emojis across the app.
- **Missing Routes & Assets**: `assets/` placeholders, `slugify.ts`, `svgParser.ts`, and Expo routes (`event/[slug].tsx`, `company/[id].tsx`) all exist.
- **Mock Data**: All 10 booths now have full company profiles.
- **Type Safety**: `npx tsc --noEmit` passes with 0 errors.

---

## ⚠️ Missing Features (Still not coded from `IMPLEMENTATION_PLAN.md`)

### 1. Font Loading (Phase 1.3)
- **Requirement**: *“Set up global typography and font loading”*
- **Status**: The app currently relies entirely on system default fonts. Although typographic tokens (`fontFamily`, `fontSize`) exist in `src/constants/theme.ts`, there is no `useFonts` hook from `expo-font` or `@expo-google-fonts/*` being loaded at the root level (`app/_layout.tsx`), meaning the VTK brand typography is not actually applied.

### 2. `expo-sqlite` Integration (Tech Stack)
- **Requirement**: Use `@react-native-async-storage/async-storage` + `expo-sqlite` for offline storage.
- **Status**: `expo-sqlite` is missing from `package.json` and is never imported. The offline fallback in `src/storage/cache.ts` currently relies *exclusively* on `AsyncStorage`. While functional for small payloads, AsyncStorage has strict size limits (~6MB) on Android devices, making it unreliable for caching massive SVG venue maps.

### 3. Dynamic SVG Canvas Parsing (Phase 3.1)
- **Requirement**: *“SVG Parser & Canvas Engine”*
- **Status**: `src/components/floorplan/InteractiveFloorplan.tsx` still hardcodes the base venue boundary and avenues (e.g., `<Rect fill="#F8FAFC" />` and `<SvgText>MAIN AVENUE A</SvgText>`) directly into the JSX. It completely ignores the `data.svg` string sent by the API backend. Furthermore, the newly created `src/utils/svgParser.ts` utility (which extracts `viewBox` strings) is never actually imported or used by the canvas.

---

## 🔧 Minor Inconsistencies & UI Polish

### 4. Missing Selection Highlight on Path-Based Booths
- **File**: `src/components/floorplan/BoothNode.tsx`
- **Problem**: When a booth is selected, the app renders a glowing dashed border (`strokeDasharray="6, 4"`) to highlight it. However, this logic is only implemented for rectangular booths (`isRect`). If a booth uses an SVG path (`'d' in coords`), this selection ring is entirely absent, leading to inconsistent user feedback.

### 5. Missing Explicit Stack Configurations for New Routes
- **File**: `app/_layout.tsx`
- **Problem**: The newly created `app/event/[slug].tsx` and `app/company/[id].tsx` routes are not explicitly defined in the root `<Stack>`. While Expo Router will discover them automatically, they will render with default React Navigation headers, which will visually clash with the app's custom headers (e.g., `FloorplanHeader` and the custom back-button header in `CompanyDetailScreen`). These screens should be explicitly mapped with `headerShown: false`.

---

## 🎯 Recommended Next Steps

If a **Phase 2 Remediation** is initiated, it should tackle:
1. Installing and loading a custom font (e.g., Inter or Roboto) in `app/_layout.tsx`.
2. Hiding default headers for the new routes in `app/_layout.tsx`.
3. Updating `InteractiveFloorplan.tsx` to dynamically parse `data.svg` using an XML/SVG parser (like `react-native-svg-uri` or manual tag parsing) instead of hardcoding the background layout.
4. Implementing the selection glow effect for `<Path>` shapes in `BoothNode.tsx`.
