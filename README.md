# 🌱 CI Seed Map — Find Cannabis Seeds Near You

An interactive, intelligence-driven map of cannabis seed breeders, seed banks, dispensaries, and cultivators across the United States. Built to solve a real problem: with pending federal hemp legislation prohibiting cannabis seeds from crossing state lines, growers need to know what genetics are available **within their state** — right now.

**Live:** [seed-map.poweredbyci.live](https://seed-map.poweredbyci.live)

---

## The Problem

The 2025 hemp law will end the free flow of cannabis genetics across state borders. Once it takes effect, the seeds available within your state become your only legal options. Most growers don't know what's available locally — and there was no single resource mapping the entire US seed distribution network.

## The Solution

CI Seed Map is the most comprehensive, independently researched directory of cannabis seed sellers in the United States. Every entry was manually verified — documenting who they are, where they operate, what genetics they carry, and how to reach them.

---

## Features

### 📍 Location Mode
- **763 geocoded pins** across 27+ states and international locations
- Red pins for physical storefronts, blue pins for online sellers
- Filter by type: Breeder, Seed Bank, Dispensary, Cultivator
- Filter by state, toggle online sellers
- Marker clustering with brand-colored density indicators

### 🌱 Breeder Mode
- Select one or more breeders from a scrollable, searchable list of 924 unique breeders
- Map shows every location that carries the selected breeder(s) using **logo markers**
- **Priority stack** — when a location carries multiple selected breeders, the first-checked breeder's logo shows with a green ring and `+N` badge
- Deduplicated by `parent_id` for multi-location breeders

### 🔍 Search & Locate
- Live search by name, city, or state with logo-enhanced results
- Geolocation "Find Me" button — zooms to user's location with a branded radius circle

### 📋 Rich Popups
- Logo + name + type badge
- Address, phone, hours, website
- **Brand logo grid** — clickable logos of carried breeders (up to 12, with "+N more")
- **Accordion** — expandable "More Info" with strain highlights and editorial audit notes

### 🔒 Data Protection
- **AWS API Gateway + Lambda** — data served via authenticated API, not a static JSON file
- **Time-limited session tokens** (30-minute HMAC-signed tokens)
- **Age gate** (21+) — must accept before accessing data
- **Private S3 bucket** — no public access to raw data
- Anti-scraping by design

### 📱 Fully Responsive
- Mobile-first with collapsible filter panel
- Hamburger navigation menu
- Touch-optimized popups and controls
- Adaptive zoom levels for portrait/landscape

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│  index.html (Leaflet.js + MarkerCluster)        │
│  ├── Age Gate → sessionStorage                  │
│  ├── GET /token → session token                 │
│  └── GET /data (+ token header) → map renders   │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│              API Gateway (Regional)              │
│  seed-map-api (2u8vskmld7)                      │
│  ├── GET /token                                 │
│  └── GET /data                                  │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│              Lambda (Python 3.12)                │
│  seed-map-api                                   │
│  ├── Token generation (HMAC-SHA256)             │
│  ├── Token validation + expiry check            │
│  └── S3 read → return JSON                      │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│              S3 (Private)                        │
│  seed-map-data-170377509849                     │
│  └── breeder_data.json (1,039 entries)          │
└─────────────────────────────────────────────────┘
```

---

## Data

| Metric | Count |
|--------|-------|
| Total entries | 1,039 |
| Unique breeders (parent_id) | 924 |
| Geocoded locations | 763 |
| States covered | 27+ |
| Brand logos | 700+ |
| Brand relationships mapped | 1,155 |

### Schema (25 columns)
`id` · `parent_id` · `img_root` · `name` · `legal_name` · `url` · `type` · `location` · `street_address` · `city` · `state` · `zip_code` · `country` · `phone` · `email` · `order` · `delivery` · `hours` · `status` · `audit_note` · `links` · `highlights` · `brands` · `last_verified` · `lat` · `lng`

Every entry includes hand-written editorial audit notes documenting the breeder's history, breeding philosophy, notable strains, and distribution channels.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Map | Leaflet.js 1.9.4 + MarkerCluster |
| Tiles | OpenStreetMap |
| Icons | Font Awesome 6.5 |
| Geocoding | Nominatim (via geopy) |
| Backend | AWS Lambda (Python 3.12) |
| API | AWS API Gateway (Regional) |
| Storage | AWS S3 (private) |
| Auth | HMAC-SHA256 session tokens |
| Forms | Formspree (20k/month free tier) |
| Hosting | Static (S3/CloudFront or any CDN) |

---

## Project Structure

```
seed-map-usa/
├── index.html              # Main map application
├── mission.html            # Mission statement & hemp law context
├── contact.html            # Dynamic contact forms (Formspree)
├── privacy.html            # Privacy Policy
├── terms.html              # Terms of Service
├── disclaimer.html         # Disclaimer
├── footer.js               # Shared footer (single source of truth)
├── assets/
│   ├── img/                # Favicon, CI badge, preview, payment badges
│   └── logo/              # 700+ brand logos (mapped by parent_id)
├── breeders/              # Breeder hero images
├── aws/
│   ├── lambda_function.py  # Lambda source
│   ├── lambda.zip          # Deployment package
│   ├── trust-policy.json   # IAM trust policy
│   └── lambda-policy.json  # IAM permissions policy
└── README.md
```

---

## Local Development

```bash
# Serve locally (requires breeder_data.json for offline dev)
python -m http.server 8000

# Rebuild JSON from CSV (if editing data locally)
python build_json.py

# Geocode new entries
python geocode.py
```

Note: The production map fetches data from AWS. For local development without API access, place a `breeder_data.json` in the root directory and temporarily swap the `fetchData()` call to `fetch('breeder_data.json')`.

---

## AWS Resources

All resources are prefixed with `seed-map-` to avoid conflicts with other projects in the same account.

| Resource | Name/ID |
|----------|---------|
| S3 Bucket | `seed-map-data-170377509849` |
| Lambda | `seed-map-api` |
| API Gateway | `seed-map-api` (`2u8vskmld7`) |
| IAM Role | `seed-map-lambda-role` |
| Stage | `prod` |
| Endpoint | `https://2u8vskmld7.execute-api.us-east-1.amazonaws.com/prod` |

### Environment Variables (Lambda)
- `TOKEN_SECRET` — HMAC signing key
- `SESSION_MINUTES` — Token TTL (default: 30)

---

## Credits

### Data & Research
**Shannon Goddard** — 3 weeks of manual research, verification, and editorial writing. 1,039 entries with hand-written audit notes, 700+ logos sourced and processed, relationship mapping across 1,155 brand connections. The dataset that powers this map is the result of deep industry knowledge and relentless digging.

### Development & Architecture
**Amazon Q Developer** — Full-stack build including:
- Interactive map with dual-mode UI (Location + Breeder mode)
- Logo marker system with priority stack logic
- Responsive design with mobile-first approach
- AWS backend architecture (S3 + Lambda + API Gateway)
- Session token authentication system
- Age gate with legal compliance
- Geocoding pipeline (Nominatim batch processing)
- Contact forms with intelligent routing
- Legal documents (Privacy, Terms, Disclaimer)
- Navigation system (hamburger menu, sticky bars)
- Loading animations, search, geolocation
- Data protection strategy

### Built With
- [Leaflet.js](https://leafletjs.com/) — Interactive maps
- [OpenStreetMap](https://www.openstreetmap.org/) — Map tiles
- [Nominatim](https://nominatim.org/) — Geocoding
- [Formspree](https://formspree.io/) — Form handling
- [Font Awesome](https://fontawesome.com/) — Icons
- [AWS](https://aws.amazon.com/) — Backend infrastructure

---

## License

© 2026 Loyal9 LLC. All rights reserved.

The data, editorial content, and compiled database are proprietary. The source code for the frontend map interface is available for reference but may not be used commercially without permission.

---

## Contact

- **Admin:** admin@loyal9.app
- **Partnerships:** shannon@loyal9.app
- **Legal:** legal@loyal9.app
- **Web:** [poweredby.ci](https://poweredby.ci)

---

*Cannabis Intelligence for a changing landscape.* 🌱
