# Design Decisions

This document outlines the core architectural and design choices for the VTK Career Mobile Floorplan application.

## 1. Why React Native with Expo?

- **Cross-Platform Parity**: Single TypeScript codebase running natively on iOS and Android.
- **Native SVG & Gesture Performance**: `react-native-svg` combined with `react-native-gesture-handler` and `react-native-reanimated` allows complex floorplans (~200+ booths) to be panned and zoomed smoothly at 60 FPS on native UI threads.
- **Expo Ecosystem**: Standardized build pipelines (EAS Build), simple OTA updates for fair-day emergency fixes, and built-in vector icons / splash screen management.

## 2. Offline-First Rationale

- **Event Hall Connectivity**: Career fairs take place in large exhibition halls (e.g. Brabanthal, ICC) where cellular network congestion is extremely common.
- **Local Persistence Strategy**:
  - Floorplan SVG and booth coordinates are fetched on initial app open or synced when connected.
  - Cached locally using `@react-native-async-storage/async-storage` or `expo-sqlite`.
  - The app remains 100% functional (interactive map, company profiles, contacts, stand numbers, degree filtering) without an active internet connection.

## 3. Floorplan Rendering Engine Strategy

Instead of embedding a WebView (which introduces scroll-lag and high memory overhead), the app parses and renders the SVG using `react-native-svg`:
- **Interactive Rectangles/Paths**: SVG booth nodes are wrapped in touchable elements linked to booth numbers.
- **Coordinate Matrix Engine**: Smooth double-tap zoom, pinch gesture, pan boundaries, and instant zoom-to-booth functionality.
- **Dynamic Visual Feedback**: Highlighted stands (category filter match), flickering state for searched companies, and colored indicators for booth status.

## 4. UI / UX Principles

- **Primary Color**: VTK Blue (`#003366`)
- **Accent Color**: VTK Yellow (`#FFCC00`)
- **Backgrounds**: Soft light grey (`#F8FAFC`) / Card white (`#FFFFFF`) with dark mode support.
- **Micro-Interactions**: Haptic feedback on booth selection (`expo-haptics`), smooth bottom-sheet modal for company info.
