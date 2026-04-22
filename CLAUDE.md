# CLAUDE.md

## What This Is

**Car Reels Creator** — upload car dealership photos + enter car details, Claude generates viral copy (hook, CTA, hashtags, caption), and Remotion renders a 9:16 MP4 ready for TikTok & Instagram Reels.

---

## How to Run

```bash
cd app
npm install
npm run dev
# Open http://localhost:3000
```

**Required environment variables** (in `app/.env`):
- `ANTHROPIC_API_KEY` — Claude copy generation

---

## Tech Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4** — styling
- **Remotion 4** — programmatic video rendering (React → MP4)
- **Claude Sonnet 4.6** — hook, CTA, hashtags, caption generation

---

## Pipeline

1. User fills car details (year, make, model, price, features, dealership)
2. User uploads car photos (drag & drop)
3. Claude generates: hook, CTA, hashtags, features list, full caption
4. User edits generated copy if needed
5. Click "Render MP4" → `/api/render` bundles Remotion + renders to `public/output/`
6. User downloads the MP4

---

## Video Format

- **Resolution**: 1080 × 1920 (9:16 portrait)
- **FPS**: 30
- **Duration**: 6 seconds per image + 3 second CTA outro
- **Codec**: H.264 MP4

---

## Workspace Structure

```
car-reels/
├── CLAUDE.md
├── app/
│   ├── .env                          # ANTHROPIC_API_KEY
│   ├── package.json
│   ├── next.config.ts
│   ├── public/
│   │   ├── uploads/                  # Uploaded car photos (served at /uploads/)
│   │   └── output/                   # Rendered MP4 files (served at /output/)
│   └── src/
│       ├── app/
│       │   ├── page.tsx              # Main UI (upload, generate, render, download)
│       │   └── api/
│       │       ├── upload/route.ts   # Save images to public/uploads/
│       │       ├── generate/route.ts # Claude copy generation
│       │       └── render/route.ts   # Remotion MP4 rendering
│       ├── lib/
│       │   ├── types.ts              # TypeScript interfaces
│       │   └── claude.ts             # Claude API client
│       └── remotion/
│           ├── index.ts              # Remotion entry point (registerRoot)
│           ├── Root.tsx              # Composition definitions
│           └── CarReel/
│               └── index.tsx         # Video template (9:16, slides + text overlays)
```

---

## Remotion Studio (Preview)

```bash
cd app
npm run studio
# Opens Remotion Studio for live composition preview
```
