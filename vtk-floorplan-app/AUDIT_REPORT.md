# 🔍 Codebase Audit Report

**Generated**: Comparing `IMPLEMENTATION_PLAN.md` (all 7 phases) against actual file-by-file implementation.

---

## ✅ What Works Correctly

| Area | Status | Notes |
|------|--------|-------|
| TypeScript types (`src/types/floorplan.ts`) | ✅ Pass | Matches `docs/data-model.md` exactly |
| API client (`src/api/client.ts`) | ✅ Pass | Proper AbortController timeout, error classes |
| Offline cache (`src/storage/cache.ts`) | ✅ Pass | AsyncStorage CRUD with correct key prefix |
| Offline-first fetch chain (`src/api/floorplan.ts`) | ✅ Pass | Live → cache → mock fallback works |
| `useFloorplanData` hook | ✅ Pass | Correct state management & loading flow |
| `useFloorplanGestures` hook | ✅ Pass | Pinch, pan, double-tap, zoom-to-point all implemented |
| `FloorplanHeader` search bar | ✅ Pass | Instant text filter, autocomplete dropdown |
| `CategoryFilterPills` | ✅ Pass | Horizontal scroll pills with active state |
| `ContactPersonCard` | ✅ Pass | Call & email via `Linking.openURL`, graceful fallback |
| `OfflineBanner` | ✅ Pass | Shows only when offline, formatted last-sync time |
| `BoothNode` with `React.memo` | ✅ Pass | Memoized, haptic feedback, rect & path rendering |
| `CompanyDetailSheet` | ✅ Partial | Works but uses `Modal` instead of `@gorhom/bottom-sheet` |
| `babel.config.js` Reanimated plugin | ✅ Pass | Correctly placed as last plugin |
| `app.json` bundle identifiers | ✅ Pass | iOS & Android correct (`be.vtk.career.floorplan`) |
| `eas.json` build profiles | ✅ Pass | dev, preview, production configured |
| `tsconfig.json` | ✅ Pass | Strict mode, `@/*` path alias |
| Theme / Design System | ✅ Pass | Complete color palette, spacing, shadows, typography tokens |
| Git initialization | ✅ Pass | `.git/` and `.gitignore` present |
| TypeScript compilation | ✅ Pass | `tsc --noEmit` passes with 0 errors |

---

## 🚨 Critical Issues (Bugs / Broken Behavior)

### 1. `@gorhom/bottom-sheet` Installed But Never Used
- **File**: `package.json` lists `@gorhom/bottom-sheet` as dependency
- **Problem**: `CompanyDetailSheet.tsx` uses a plain React Native `<Modal>` instead
- **IMPLEMENTATION_PLAN §5.1** explicitly states: *"Create CompanyDetailSheet using `@gorhom/bottom-sheet`. Snap points: `[35%, 85%]`."*
- **Impact**: No smooth gesture-driven bottom sheet with snap points — the current `<Modal>` has no drag-to-dismiss, no partial snap heights, and no spring physics
- **Fix**: Refactor `CompanyDetailSheet` to use `BottomSheet` from `@gorhom/bottom-sheet` with proper snap points `['35%', '85%']`

### 2. Searched Booth Flicker Animation Not Implemented
- **File**: `src/components/floorplan/BoothNode.tsx`
- **Problem**: `isFlickering` prop is accepted but only toggles the fill color statically to `COLORS.accent`. There is **no actual Reanimated animation** (no `withRepeat`, `withSequence`, `withTiming` calls) to create the 3-second pulse/flicker effect between `#FFCC00` ↔ `#003366`
- **IMPLEMENTATION_PLAN §3.2** states: *"Searched booth pulse animation (flicker state via Reanimated)"*
- **`docs/exported-floorplan-spec.md` §2.5** states: *"Target booth pulses / flickers between #FFCC00 and #003366 for 3 seconds"*
- **Fix**: Use `useAnimatedProps` with `withRepeat(withSequence(withTiming(...)))` to animate fill color for exactly 3 seconds when `isFlickering === true`

### 3. `resetZoom` Has `'worklet'` Directive But Is Called From JS Thread
- **File**: `src/hooks/useFloorplanGestures.ts` line 85
- **Problem**: `resetZoom()` has a `'worklet'` directive but is called from `onPress` handler in `InteractiveFloorplan.tsx` (JS thread). Using `withTiming` inside a worklet that's called from JS can cause crashes or silent failures on some devices.
- **Fix**: Either remove the `'worklet'` directive (since it's called from JS), or use `runOnUI(resetZoom)()` in the caller

---

## ⚠️ Missing Features (Planned But Not Coded)

### 4. Missing Route: `app/event/[slug].tsx`
- **`docs/architecture.md`** specifies this route for event-specific floorplan screens
- **Status**: Directory `app/event/` does not exist
- **Impact**: No deep-linking support for specific events

### 5. Missing Route: `app/company/[id].tsx`
- **`docs/architecture.md`** specifies this route for full company view screens
- **Status**: Directory `app/company/` does not exist
- **Impact**: No standalone company detail screen (currently only accessible via bottom sheet modal)

### 6. Missing `src/utils/` Directory
- **`docs/architecture.md`** lists `src/utils/svgParser.ts` and `src/utils/slugify.ts`
- **Status**: Entire `src/utils/` directory does not exist
- **Impact**: No SVG parser utility (SVG is rendered statically), no slugify helper

### 7. Missing `assets/` Directory
- **`app.json`** references `./assets/icon.png`, `./assets/splash.png`, `./assets/adaptive-icon.png`, `./assets/favicon.png`
- **Status**: `assets/` directory does not exist
- **Impact**: App will crash on build because referenced asset files are missing. This is a **build blocker**.

### 8. Mock Data Only Has 5 of 10 Booths
- **SVG** in `mockFloorplan.ts` renders 10 booth groups (`booth_1` through `booth_10`)
- **Booth data array** only contains 5 entries (ASML, IMEC, Barco, Nokia Bell Labs, Materialise)
- **Missing**: Melexis (51), DEME (52), Jan De Nul (53), McKinsey (54), Colruyt (55) — these show in the SVG but have no interactive data
- **Impact**: Bottom row booths are visible but non-tappable (no company data to display)

### 9. No `expo-sqlite` Integration
- **IMPLEMENTATION_PLAN §Tech Stack** and **`docs/design-decisions.md` §2** both mention `expo-sqlite` as part of offline storage
- **Status**: Not in `package.json`, never imported anywhere
- **Impact**: Only `AsyncStorage` is used (limited to ~6MB on some devices for large floorplan payloads)

### 10. `searchedBoothId` Flicker Never Auto-Clears
- **File**: `app/index.tsx`
- **Problem**: When a user selects a search result, `searchedBoothId` is set but never cleared. The searched booth stays in "flicker" state permanently until user searches for another booth.
- **Expected**: Flicker animation should run for 3 seconds then auto-clear
- **Fix**: Add a `setTimeout(() => setSearchedBoothId(null), 3000)` after setting it, or implement auto-clear in the gesture hook

---

## 📦 Unused Dependencies

| Package | In `package.json` | Actually Imported | Action |
|---------|-------------------|-------------------|--------|
| `@gorhom/bottom-sheet` | ✅ Yes | ❌ No | Use it (fix §1) or remove it |
| `lucide-react-native` | ✅ Yes | ❌ No | Use for icons or remove to save bundle size |

---

## 🔧 Minor Issues & Code Quality

### 11. Emoji Icons Instead of Proper Icon Library
- **Files**: `FloorplanHeader.tsx` (🔍), `OfflineBanner.tsx` (⚡), `ContactPersonCard.tsx` (✉️📞), `CompanyDetailSheet.tsx` (📍🌐)
- **Problem**: `lucide-react-native` is installed but unused. App uses emoji characters for all icons, which renders inconsistently across iOS/Android
- **Fix**: Replace emojis with `lucide-react-native` icons (e.g. `<Search />`, `<WifiOff />`, `<Mail />`, `<Phone />`, `<MapPin />`, `<Globe />`)

### 12. No ESLint Configuration
- **`package.json`** has `"lint": "eslint ."` script
- **Status**: No `.eslintrc`, `.eslintrc.json`, or `eslint.config.js` file exists
- **Impact**: `npm run lint` will fail or produce no output

### 13. Pan Boundary Rubber-Banding Not Implemented
- **IMPLEMENTATION_PLAN §3.1** states: *"Pan boundary rubber-banding via useAnimatedStyle"*
- **Status**: Pan gesture has no boundary clamping — user can pan the map completely off-screen with no rubber-band effect to snap back
- **Fix**: Add `clamp()` logic in `panGesture.onEnd()` based on scale and canvas dimensions

### 14. Double-Tap Zoom Not Centered on Tap Point
- **`docs/exported-floorplan-spec.md` §2.2** states: *"Double-tapping anywhere on map zooms in 2.5x centered around the tapped point"*
- **Status**: Current double-tap zoom ignores event coordinates and just scales from current position
- **Fix**: Use `event.x` / `event.y` from `Gesture.Tap().onEnd(event => ...)` to calculate the center translation offset

### 15. `InteractiveFloorplan.tsx` Has Hardcoded SVG Base Layout
- Lines 54–83 render venue boundaries, walkway labels, and text directly in the component
- **Expected**: These should come from the `data.svg` field parsed from the API/cache
- **Impact**: The base venue layout is duplicated (once in `mockFloorplan.ts` SVG string, once in JSX). Changes to the venue layout need to be made in two places

### 16. No Font Loading
- **IMPLEMENTATION_PLAN §1.3** states: *"Set up global typography and font loading"*
- **Status**: `TYPOGRAPHY` tokens exist in `theme.ts` but no actual font files are loaded (no `useFonts` from `expo-font`, no `@expo-google-fonts/*`)
- **Impact**: App uses system default fonts instead of a consistent typographic system

---

## 📊 Summary

| Category | Count |
|----------|-------|
| ✅ Fully working | 17 |
| 🚨 Critical issues (bugs / major deviations) | 3 |
| ⚠️ Missing features (planned but not coded) | 7 |
| 📦 Unused dependencies | 2 |
| 🔧 Minor quality issues | 6 |
| **Total issues** | **18** |

---

## 🎯 Recommended Fix Priority

1. **P0 — Build Blockers**: Create `assets/` directory with placeholder icon/splash images (§7)
2. **P1 — Core UX Gaps**: Implement `@gorhom/bottom-sheet` for CompanyDetailSheet (§1), implement flicker animation (§2), add pan boundary clamping (§13)
3. **P2 — Missing Data**: Complete mock data for booths 6–10 (§8), auto-clear searchedBoothId (§10)
4. **P3 — Architecture**: Add missing routes `app/event/[slug].tsx` & `app/company/[id].tsx` (§4, §5), add `src/utils/` (§6)
5. **P4 — Polish**: Replace emoji with lucide icons (§11), add ESLint config (§12), fix double-tap centering (§14), add font loading (§16)
6. **P5 — Cleanup**: Remove unused dependencies or integrate them (§unused deps)
