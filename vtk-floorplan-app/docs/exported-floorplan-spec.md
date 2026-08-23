# Exported Floorplan Technical Specification

This document details how the floorplan SVG and booth mapping logic from `career-prisma` are parsed, rendered, and interacted with inside the React Native mobile application.

## 1. SVG Structure & Parser Workflow

1. **SVG Extraction**:
   - The backend stores floorplan layout as raw SVG text in the `files` table.
   - Nodes containing `id="booth_X"` or matching coordinates mapped in the `booths` database table correlate SVG shapes to database `booth` records.

2. **Parsing in React Native**:
   - In React Native, raw SVG string is rendered via `react-native-svg` (`SvgXml` component) or parsed into native vector sub-elements (`Rect`, `Path`, `G`, `Text`).
   - Dynamic overlay elements (stand numbers, highlight strokes, search flicker states) are rendered over the base SVG layers.

3. **Viewport & Bounding Boxes**:
   - The SVG `viewBox="minX minY width height"` (e.g. `viewBox="0 0 1000 600"`) defines the map canvas space.
   - The interactive canvas maintains matrix transformation state: `[scale, translateX, translateY]`.

## 2. Interactive Features & Gestures

1. **Pinch-to-Zoom & Pan**:
   - Driven by `react-native-gesture-handler` (`Gesture.Pinch()`, `Gesture.Pan()`).
   - Zoom scale boundaries: `1.0x` (fit canvas to screen) to `5.0x` (detail view).
   - Pan bounds are constrained to prevent panning map completely off-screen.

2. **Double Tap to Zoom**:
   - Double-tapping anywhere on map zooms in `2.5x` centered around the tapped point.

3. **Booth Tap Detection**:
   - Tapping a booth shape triggers:
     - Haptic vibration (`Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)`).
     - Selection ring animation around stand.
     - Opening of `CompanyDetailSheet` with loaded company & contact details.

4. **Category Filtering & Highlighting**:
   - When a Master filter pill (e.g. "Computer Science") is active:
     - Matching company booths stay vibrant with stand fill color `#003366` or `#FFCC00`.
     - Non-matching booths are dimmed down (opacity `0.25`).

5. **Search & Flicker Effect**:
   - When user types a company name in search bar:
     - Matching booth coordinates are located.
     - Map automatically animates zoom & pan to center the target booth.
     - Target booth pulses / flickers between `#FFCC00` and `#003366` for 3 seconds to catch user's eye.

## 3. Company Detail & Contact Person Display

When a stand is tapped, the `CompanyDetailSheet` bottom modal slides up with:
- **Header**: Company Logo + Name + Stand Number (Badge).
- **Quick Links**: Website URL button (opens in-app browser or native Safari/Chrome), Direct Directions / Stand Highlight.
- **About**: Short and long descriptions.
- **Contact Persons / Representatives**: Cards showing representative name, job title, email, and phone number with quick call/email action buttons.
- **Target Fields**: Badges of target Master degrees.
- **Vacancies**: Accordion or list of open job roles.
