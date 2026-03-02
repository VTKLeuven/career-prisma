# k6 Stress Tests — VTK Career Jobfair

Stress tests for the jobfair website, simulating 2000+ attendees with 1000+ concurrent users.

## Prerequisites

### 1. Install k6

```bash
# macOS
brew install k6

# Or download from https://grafana.com/docs/k6/latest/set-up/install-k6/
```

### 2. Create load-test accounts in Directus

Create dedicated test accounts — **never use real credentials**:

| Account | Role | Purpose |
|---------|------|---------|
| `loadtest-company@example.com` | Company Rep | QR scanning, CV downloads |
| `loadtest-student@example.com` | Student | Student auth flow |

### 3. Collect test data IDs

You need real IDs from your Directus instance for meaningful tests:

- **Event slug**: the slug of your jobfair event page (e.g. `jobfair-2026`)
- **Attendant UUIDs**: a few `attendant_uuid` values from `form_responses`
- **Booth IDs**: IDs from the `Booths` collection
- **Drink IDs**: IDs from the `drinks` collection
- **CV file IDs**: file IDs from Directus assets (for CV download testing)

## Quick Start

```bash
# Run the full stress test against localhost
k6 run k6/stress-test.js

# Run against a staging server with test data
k6 run \
  -e BASE_URL=https://staging.yoursite.be \
  -e COMPANY_REP_EMAIL=loadtest@company.be \
  -e COMPANY_REP_PASSWORD=secret123 \
  -e STUDENT_EMAIL=loadtest@student.be \
  -e STUDENT_PASSWORD=secret123 \
  -e TEST_EVENT_SLUG=jobfair-2026 \
  -e TEST_ATTENDANT_UUIDS=uuid1,uuid2,uuid3 \
  -e TEST_BOOTH_IDS=1,2,3,4,5 \
  -e TEST_DRINK_IDS=drink1,drink2 \
  -e TEST_CV_FILE_IDS=file-uuid-1,file-uuid-2 \
  k6/stress-test.js
```

## Available Tests

### Full stress test (all scenarios combined)

```bash
k6 run k6/stress-test.js
```

Runs 5 concurrent scenarios simulating real jobfair traffic patterns:

| Scenario | Peak VUs | What it tests |
|----------|----------|---------------|
| `public_browsers` | 1000 | Homepage, event pages, floorplan, vacancies |
| `qr_scanners` | 80 | Company reps scanning student QR badges |
| `drink_orderers` | 150 | Booth QR → drink menu → order → status polling |
| `cv_downloaders` | 40 | Company reps fetching scan history + CV files |
| `student_auth` | 150 | Student login + /api/user/check polling |

Total peak concurrent VUs: **~1420** (matching the 1000+ target).

### Individual scenarios

Run a single scenario in isolation for targeted debugging:

```bash
k6 run k6/scenarios/public-pages.js     # Public page browsing (up to 1000 VUs)
k6 run k6/scenarios/qr-scanning.js      # QR scanning only (up to 80 VUs)
k6 run k6/scenarios/drink-ordering.js   # Drink ordering only (up to 150 VUs)
k6 run k6/scenarios/spike-test.js       # Sudden traffic spike (up to 2000 VUs)
k6 run k6/scenarios/soak-test.js        # Sustained load over 30 minutes
```

### Spike test

Simulates the "doors open" moment — goes from 50 to 2000 VUs in 20 seconds:

```bash
k6 run k6/scenarios/spike-test.js
```

### Soak test

Runs moderate load for ~30 minutes to catch memory leaks and connection pool exhaustion:

```bash
k6 run k6/scenarios/soak-test.js
```

## Scaling Down for Development

If you want to do a quick smoke test locally, reduce the VU counts:

```bash
# Smoke test: just 10 VUs for 30 seconds
k6 run --vus 10 --duration 30s k6/scenarios/public-pages.js
```

## Understanding Results

### Key metrics to watch

| Metric | Threshold | What it means |
|--------|-----------|---------------|
| `http_req_duration (p95)` | < 2s | 95% of requests complete within 2 seconds |
| `http_req_failed` | < 5% | Less than 5% of requests return errors |
| `page_load_duration (p95)` | < 3s | SSR pages render within 3 seconds |
| `scan_success_rate` | > 90% | QR scans complete successfully |
| `order_success_rate` | > 85% | Drink orders are processed |

### Exporting results

```bash
# JSON output for post-processing
k6 run --out json=results.json k6/stress-test.js

# CSV output
k6 run --out csv=results.csv k6/stress-test.js
```

### Grafana Cloud integration

For real-time dashboards, use [Grafana Cloud k6](https://grafana.com/products/cloud/k6/):

```bash
K6_CLOUD_TOKEN=your-token k6 cloud k6/stress-test.js
```

## Architecture Notes

### What gets stressed

```
                 ┌──────────────┐
  k6 VUs ──────►│  Next.js App  │──────► Directus CMS (API + DB)
                 │  (SSR + API)  │
                 └──────────────┘
```

- **Next.js SSR**: booth pages, event pages, homepage are server-rendered
- **Next.js API routes**: login, QR scan, user check, CV proxy, homepage API
- **Directus**: all data reads/writes go through the Directus SDK
- **In-memory caches**: homepage (2min TTL) and event pages (5min TTL)

### Bottlenecks to watch for

1. **Directus connection pool**: many concurrent DB queries
2. **SSR rendering**: Next.js server under heavy load
3. **In-memory caches**: homepage/event caches help but expire under pressure
4. **CV file proxy**: large PDF files proxied through Next.js → Directus
5. **Auth token refresh**: `/api/user/check` refreshes tokens via Directus
6. **Write contention**: concurrent QR scans create DB records simultaneously

## File Structure

```
k6/
├── config.js                    # Shared configuration & env vars
├── stress-test.js               # Main multi-scenario stress test
├── lib/
│   ├── auth.js                  # Login helpers (company rep, student)
│   └── helpers.js               # Utility functions
├── scenarios/
│   ├── public-pages.js          # Public page browsing
│   ├── qr-scanning.js           # QR code scanning flow
│   ├── drink-ordering.js        # Booth drink ordering
│   ├── spike-test.js            # Sudden traffic spike
│   └── soak-test.js             # Long-running sustained load
└── README.md
```
