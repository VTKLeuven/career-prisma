# Architecture & File Structure

This document outlines the codebase organization and component architecture for `vtk-floorplan-app`.

## Folder Structure

```
vtk-floorplan-app/
├── AGENTS.md                   # Agent instructions & repo rules
├── IMPLEMENTATION_PLAN.md      # A-to-Z execution roadmap
├── docs/                       # Technical documentation
│   ├── README.md
│   ├── design-decisions.md
│   ├── architecture.md
│   ├── data-model.md
│   └── exported-floorplan-spec.md
├── assets/                     # Static assets (icons, splash, default floorplan SVG fallback)
├── src/
│   ├── api/                    # API client for VTK Career backend
│   │   ├── client.ts           # HTTP client with offline fallback
│   │   └── floorplan.ts        # Endpoints for events, floorplans, booths, companies
│   ├── components/
│   │   ├── floorplan/          # Floorplan map components
│   │   │   ├── InteractiveFloorplan.tsx  # Pinch/zoom SVG canvas
│   │   │   ├── BoothNode.tsx             # Interactive SVG booth element
│   │   │   ├── FloorplanHeader.tsx       # Event switcher + Search bar
│   │   │   ├── CategoryFilterPills.tsx   # Master degree filter pills
│   │   │   └── BoothTooltip.tsx          # Floating tooltip on booth hover/tap
│   │   ├── company/
│   │   │   ├── CompanyDetailSheet.tsx    # Bottom sheet popup modal
│   │   │   ├── ContactPersonCard.tsx     # Representative contact item
│   │   │   └── CompanyLogo.tsx           # Cached logo image renderer
│   │   └── ui/                     # Generic reusable UI primitives (Buttons, Cards, Badges)
│   ├── hooks/                  # Custom React hooks
│   │   ├── useFloorplanData.ts # Data fetching & offline sync hook
│   │   ├── useBoothSearch.ts   # Company search & highlight hook
│   │   └── useFloorplanGestures.ts # Pan & zoom gesture handler logic
│   ├── storage/                # Local cache storage (AsyncStorage / SQLite)
│   │   └── cache.ts
│   ├── types/                  # TypeScript interface definitions
│   │   └── floorplan.ts
│   └── utils/                  # Utility functions
│       ├── svgParser.ts        # Parses raw SVG text to native render tree
│       └── slugify.ts
├── app/                        # Expo Router screen routes
│   ├── _layout.tsx             # Root layout with gesture & theme providers
│   ├── index.tsx               # Main Floorplan Screen
│   ├── event/[slug].tsx        # Specific Event Floorplan Screen
│   └── company/[id].tsx        # Full Company View Screen
├── app.json                    # Expo configuration
├── package.json
└── tsconfig.json
```

## Navigation Flow

1. **Root Screen (`/`)**: Automatically loads active/upcoming event floorplan.
2. **Search / Filter Action**: Selecting a company or filtering by Master degree highlights/flickers corresponding booths on map.
3. **Booth Tap Action**: Opens `CompanyDetailSheet` (bottom-sheet modal) showing stand number, company name, logo, description, contact persons, vacancies, website link.
