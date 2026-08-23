# Implementation Plan: VTK Career Mobile Floorplan App (iOS & Android)

This master plan provides an **A-to-Z execution roadmap** for implementing the cross-platform VTK Career Mobile Floorplan App using React Native, Expo, and TypeScript.

---

## 📋 Executive Overview

The goal is to build a high-performance, offline-capable mobile app for iOS and Android that allows students and visitors at VTK jobfairs/career events to:
1. **Explore the Event Floorplan**: Pinch, zoom, pan, and tap stands on an interactive vector map.
2. **Search & Filter**: Find companies instantly by name or filter stands by field of study / Master degree.
3. **View Company Details**: See company logo, description, target degrees, open vacancies, and website link.
4. **Contact Representatives**: View contact persons present at the stand with direct email and call triggers.
5. **Work 100% Offline**: Cache all event data, SVG maps, and company info locally for crowded venue halls.

---

## 🛠️ Tech Stack & Architecture

- **Framework**: React Native with Expo SDK 51+ (Expo Router v3)
- **Language**: TypeScript
- **UI & Styling**: NativeWind (Tailwind CSS for React Native) / StyleSheet
- **Vector Graphics**: `react-native-svg`
- **Gestures & Animations**: `react-native-gesture-handler` + `react-native-reanimated` v3
- **Bottom Sheet Modal**: `@gorhom/bottom-sheet`
- **Offline Storage**: `@react-native-async-storage/async-storage` + `expo-sqlite`
- **Haptics**: `expo-haptics`
- **HTTP Client**: `axios` / `fetch` with offline fallback wrapper

---

## 🚀 Execution Phases (A to Z Roadmap)

### Phase 1: Project Initialization & Configuration
- [x] **1.1 Expo Project Setup**:
  - Initialize Expo app with TypeScript template (`npx create-expo-app@latest -t tabs`).
  - Configure `app.json` (iOS bundle identifier `be.vtk.career.floorplan`, Android package `be.vtk.career.floorplan`, splash screen, icons).
- [x] **1.2 Dependencies Installation**:
  - Install `react-native-svg`, `react-native-reanimated`, `react-native-gesture-handler`, `@gorhom/bottom-sheet`, `lucide-react-native`, `expo-haptics`, `expo-web-browser`.
  - Configure `babel.config.js` with Reanimated plugin.
- [x] **1.3 Design System & Theme Setup**:
  - Define VTK color palette (Primary `#003366`, Yellow `#FFCC00`, Slate text `#0F172A`, Surface `#FFFFFF`, Background `#F8FAFC`).
  - Set up global typography and font loading.

### Phase 2: Data Models, Types & API Client
- [x] **2.1 TypeScript Type Definitions**:
  - Copy and verify `src/types/floorplan.ts` data interfaces (`ExportedFloorplanData`, `ExportedBooth`, `ExportedCompany`, `ExportedRepresentative`, `ExportedMaster`).
- [x] **2.2 API Service & Offline Cache Layer**:
  - Implement `src/api/client.ts` to fetch floorplan payload from VTK Career backend (`GET /api/events/[slug]/floorplan`).
  - Build `src/storage/cache.ts` using AsyncStorage to save floorplan JSON & SVG text upon network success.
  - Implement fallback loader: if offline, load cached event floorplan instantly.

### Phase 3: Interactive Vector Floorplan Component
- [x] **3.1 SVG Parser & Canvas Engine**:
  - Create `src/components/floorplan/InteractiveFloorplan.tsx`.
  - Implement view transformation wrapper with `react-native-gesture-handler` (`Gesture.Simultaneous(Gesture.Pan(), Gesture.Pinch())`).
  - Bind scale limits (1.0x to 5.0x) and pan boundary rubber-banding via `useAnimatedStyle`.
- [x] **3.2 Interactive Stand (Booth) Rendering**:
  - Create `src/components/floorplan/BoothNode.tsx`.
  - Render SVG paths/rectangles with dynamic styling:
    - Stand label text (booth number).
    - Active category filter highlight state (dim non-matching booths to opacity 0.25).
    - Selected booth highlight ring (`#FFCC00` border).
    - Searched booth pulse animation (flicker state via Reanimated).
- [x] **3.3 Touch & Haptic Handling**:
  - Attach touch gestures to booth elements with immediate haptic response (`Haptics.impactAsync`).

### Phase 4: Header, Search & Category Filters
- [x] **4.1 Header & Search Bar**:
  - Build `src/components/floorplan/FloorplanHeader.tsx`.
  - Instant text search filter for company names with auto-complete dropdown.
  - Tapping a search result triggers `zoomToBooth(boothId)` matrix transformation and activates 3-second flicker animation on target booth.
- [x] **4.2 Master Degree Category Filter**:
  - Build `src/components/floorplan/CategoryFilterPills.tsx`.
  - Horizontal scrolling pills showing master degrees (e.g. "Computer Science", "Electrical", "Mechanical", "All").
  - Tapping a pill filters highlighted booths instantly.

### Phase 5: Company & Contact Person Detail Modal
- [x] **5.1 Bottom Sheet Modal Component**:
  - Create `src/components/company/CompanyDetailSheet.tsx` using `@gorhom/bottom-sheet`.
  - Snap points: `[35%, 85%]`.
- [x] **5.2 Company Information Display**:
  - Company logo, name, location, booth number badge.
  - Short and long description text.
  - Target field tags (master badges).
  - Open vacancies list with job titles and types.
- [x] **5.3 Contact Persons / Representatives Component**:
  - Create `src/components/company/ContactPersonCard.tsx`.
  - Displays representative avatar/photo, full name, job title (e.g. "Recruiting Lead").
  - Quick action buttons: "Call" (`Linking.openURL('tel:...')`) and "Email" (`Linking.openURL('mailto:...')`).
- [x] **5.4 Website & External Link Action**:
  - "Visit Website" button using `expo-web-browser` (`WebBrowser.openBrowserAsync(websiteUrl)`) for clean in-app browsing experience.

### Phase 6: Offline UX & Performance Optimization
- [x] **6.1 Offline Banner & Status Bar**:
  - Display non-intrusive "Offline Mode - Showing Cached Map" banner when disconnected.
- [x] **6.2 Image Caching**:
  - Pre-cache company logo images using `expo-image` for instant render without network delay.
- [x] **6.3 SVG Render Performance**:
  - Use React `memo` on `BoothNode` components to avoid unnecessary re-renders when panning/zooming.

### Phase 7: Testing, Building & Distribution
- [x] **7.1 Automated & Manual Verification**:
  - Test on iOS Simulator (iPhone 15 Pro, iPad) and Android Emulator (Pixel 7).
  - Test pinch-to-zoom smoothness (ensure 60 FPS performance).
  - Test offline toggle (airplane mode) and verify full functionality.
- [x] **7.2 EAS Build & Store Deployment Prep**:
  - Configure `eas.json` for iOS TestFlight and Android Internal Testing.
  - Generate app icons and splash assets.
