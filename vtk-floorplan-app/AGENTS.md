# AGENTS.md

Instructions for AI coding agents working in this repository (`vtk-floorplan-app`).

## Read `docs/` first

**Before you plan or write anything, read [`docs/`](docs/).**
Start with [`docs/design-decisions.md`](docs/design-decisions.md) — it explains what this mobile app is and the design decisions that govern the code structure.

- [`docs/design-decisions.md`](docs/design-decisions.md) — start here
- [`docs/architecture.md`](docs/architecture.md) — app structure and navigation
- [`docs/data-model.md`](docs/data-model.md) — TypeScript data shapes & Prisma export contracts
- [`docs/exported-floorplan-spec.md`](docs/exported-floorplan-spec.md) — SVG floorplan rendering & booth interaction spec
- [`IMPLEMENTATION_PLAN.md`](../IMPLEMENTATION_PLAN.md) — A-to-Z execution roadmap

## What this project is

**VTK Career Mobile Floorplan App** — a cross-platform iOS and Android mobile app built with React Native + Expo.
It provides students and event visitors with a blazingly fast, offline-capable interactive floorplan map for VTK jobfairs and events. Users can search companies, filter by master degree / field, view stand locations in real-time, see company details, key contact persons, vacancies, and direct website links.

## Core Rules

1. **Cross-Platform Compatibility**: Always ensure components work seamlessly on both iOS and Android. Use `react-native-svg` and `react-native-reanimated` with `react-native-gesture-handler` for smooth 60fps pinch-to-zoom and panning.
2. **Offline-First Storage**: Store floorplan SVGs, booth mappings, and company profiles in local storage (AsyncStorage / SQLite) so the app works flawlessly inside crowded event halls without internet connection.
3. **No Unneeded Dependencies**: Keep the bundle lean. Use Expo SDK standard libraries whenever possible.
4. **TypeScript Strictness**: Strictly type all API responses, booth coordinates, and navigation route params.
5. **Aesthetics & Performance**: Keep animations liquid smooth (use native thread driving via Reanimated). Use VTK brand colors (`#003366` primary blue, `#FFCC00` accent yellow, clean dark/light UI cards).

## Commands

```bash
npx expo start         # Start Expo dev server
npx expo start --ios   # Run on iOS Simulator
npx expo start --android # Run on Android Emulator
npm run lint           # ESLint check
npm run type-check     # TypeScript check
```
