# SkillMap — Claude Code Project Guide

## Project Overview

SkillMap is a full-stack web application that visualizes in-demand skill trends for design and creative job roles. It fetches job postings from the Fantastic.jobs API via RapidAPI, processes and stores skill keyword frequency data in MongoDB using Prisma ORM, and presents it as an interactive data visualization on a public webpage.

The target user is a design student or early-career creative (persona: Emma Clarke, age 22) who wants to identify their skill gaps and build a focused, achievable learning path into the industry.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Backend | Node.js + Express |
| Database | MongoDB Atlas + Prisma ORM (MongoDB connector) |
| Job Data API | Fantastic.jobs via RapidAPI |
| Scheduler | node-cron (daily automated refresh) |
| Frontend | HTML + CSS + JavaScript |
| Charts | Chart.js |
| Deployment | Vercel (frontend + serverless API functions) |

---

## Project Structure

```
skillmap/
├── api/
│   ├── skills.js         # GET /api/skills — Vercel serverless function
│   ├── trends.js         # GET /api/trends — Vercel serverless function
│   └── scrape.js         # POST /api/scrape — manual trigger for testing
├── prisma/
│   ├── schema.prisma     # Prisma schema with MongoDB connector
│   └── seed.js           # Mock data seeder using Prisma Client
├── scripts/
│   ├── fetch.js          # Fantastic.jobs API fetch via RapidAPI
│   ├── transform.js      # Keyword extraction + normalization
│   └── cron.js           # node-cron daily scheduler (runs at midnight)
├── public/
│   ├── index.html        # Main page structure
│   ├── style.css         # Styles (desktop only, min-width 1024px)
│   └── app.js            # Frontend JS + Chart.js rendering
├── .env                  # Environment variables (never commit this)
├── vercel.json           # Vercel routing config
├── CLAUDE.md             # This file
└── package.json
```

---

## Environment Variables

Create a `.env` file in the root with the following:

```
DATABASE_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/skillmap?retryWrites=true&w=majority
RAPIDAPI_KEY=your_rapidapi_key
RAPIDAPI_HOST=fantastic-jobs.p.rapidapi.com
```

Never hardcode these values anywhere in the codebase. Always read from `process.env`.

---

## Database Setup (Prisma + MongoDB)

- Provider: MongoDB (via Prisma MongoDB connector)
- Do NOT use Mongoose — use Prisma Client exclusively for all database operations
- Do NOT run `prisma migrate dev` — MongoDB does not support migrations
- Use `npx prisma db push` to sync schema changes to MongoDB
- Run `npx prisma generate` after any changes to `schema.prisma`

### Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

model Skill {
  id      String   @id @default(auto()) @map("_id") @db.ObjectId
  role    String
  skill   String
  count   Int
  total   Int
  jobType String
  date    DateTime @default(now())

  @@index([role, jobType, date])
}
```

---

## Data Pipeline

The pipeline runs in this exact order every 24 hours via node-cron:

```
Fantastic.jobs API (RapidAPI)
        ↓
  fetch.js — fetch raw job postings for all 4 roles
        ↓
  transform.js — extract keywords, count frequency, normalize labels
        ↓
  MongoDB via Prisma — store dated skill snapshots
        ↓
  REST API (Express) — serve filtered data to frontend
        ↓
  Chart.js — render interactive charts in browser
        ↓
  User — selects role and job type to filter visualization
        ↓
  (loop back daily via cron job)
```

---

## API Endpoints

### GET /api/skills
Returns top 10 skills for a selected role and job type, sorted by count descending.

```
GET /api/skills?role=ux&type=fulltime
```

Query params:
- `role` — one of: `ux`, `product`, `brand`, `motion`
- `type` — one of: `fulltime`, `parttime`, `contract`, `internship`

Prisma query pattern:
```javascript
prisma.skill.findMany({
  where: { role, jobType },
  orderBy: { count: 'desc' },
  take: 10
})
```

### GET /api/trends
Returns skill frequency grouped by date for the past 30 days.

```
GET /api/trends?role=ux
```

### POST /api/scrape
Manually triggers a Fantastic.jobs fetch and transformation run. For testing only — not exposed in production UI.

---

## RapidAPI + Fantastic.jobs

### Rate Limits
- **Hard quota**: 25 requests/month, 250 jobs/month
- **Strategy**: Weekly rotating fetch (Option A)
  - Each cron run queries 1-2 roles on a rotating schedule
  - Week 1: UI/UX + Product Designer
  - Week 2: Graphic + Experiential Designer
  - Week 3: Digital + Visual Designer
  - Week 4: Multidisciplinary Designer (restart cycle)
  - Estimated usage: ~4-5 requests/month, leaves buffer for testing

### API Calls
- Endpoint: `GET https://fantastic-jobs.p.rapidapi.com/jobs?query={role}&location=Ontario,Canada&page=1`
- Headers required: `x-rapidapi-key` and `x-rapidapi-host`
- Fetch up to 50 postings per role per scheduled run
- Add 1–2 second delay between role fetches
- Track remaining API quota on every successful response (see below)

### API Quota Tracking
Store in MongoDB via Prisma:
```prisma
model ApiQuota {
  id             String   @id @default(auto()) @map("_id") @db.ObjectId
  requestsRemain Int
  jobsRemain     Int
  lastUpdated    DateTime @default(now())
}
```

Update `requestsRemain` and `jobsRemain` after every API call using values from RapidAPI response headers (if available) or manually decrement if headers unavailable. Log quota status to console so it's visible in deployment logs.

### Target Roles (Canada, Ontario Only)

| Role Label | Query String |
|---|---|
| UI/UX Designer | `UI+UX+Designer` |
| Product Designer | `Product+Designer` |
| Graphic Designer | `Graphic+Designer` |
| Experiential Designer | `Experiential+Designer` |
| Digital Designer | `Digital+Designer` |
| Visual Designer | `Visual+Designer` |
| Multidisciplinary Designer | `Multidisciplinary+Designer` |

All queries must include location filter: `location=Ontario,Canada`

---

## Keyword Normalization Rules

When processing job descriptions in `transform.js`, apply these rules:

- Convert all skill labels to title case
- Merge common variations into one canonical label:
  - "Adobe XD", "Xd", "xd" → `Adobe XD`
  - "Figma", "figma" → `Figma`
  - "After Effects", "AE", "after effects" → `After Effects`
  - "JavaScript", "JS", "js" → `JavaScript`
  - "Illustrator", "AI" → `Adobe Illustrator`
  - "InDesign" → `Adobe InDesign`
  - "Photoshop", "PSD" → `Adobe Photoshop`
  - "Cinema 4D", "C4D" → `Cinema 4D`
  - "Blender", "blender" → `Blender`
- **Skill counting per posting**: Only count a skill ONCE per job posting document, even if mentioned multiple times in the job description
- Remove duplicates within a single posting before incrementing the count

---

## Seed Data

If the API has not run yet, seed MongoDB using the Prisma seed script:

```bash
npx prisma db seed
```

The seed script (`prisma/seed.js`) should generate 14 days of historical snapshots for all 7 roles using these skill lists as reference:

- **UI/UX Designer**: Figma, User Research, Prototyping, Usability Testing, Design Systems, Wireframing, Accessibility, Adobe XD
- **Product Designer**: Figma, Design Systems, Cross-functional Collaboration, Prototyping, Data-informed Design, Accessibility, User Research, A/B Testing
- **Graphic Designer**: Adobe Illustrator, Typography, Adobe Photoshop, Brand Strategy, Adobe InDesign, Figma, Layout Design, Color Theory
- **Experiential Designer**: Concept Development, User Journey Mapping, Prototyping, Interaction Design, Figma, Adobe XD, Spatial Design, Wayfinding
- **Digital Designer**: Figma, Adobe XD, HTML/CSS, Responsive Design, Design Systems, Accessibility, User Interface, Adobe Photoshop
- **Visual Designer**: Adobe Illustrator, Adobe Photoshop, Typography, Color Theory, Adobe InDesign, Figma, Branding, Layout Design
- **Multidisciplinary Designer**: Figma, Adobe Creative Suite, Project Management, Communication, Collaboration, Adaptability, Problem-solving, Cross-functional Skills

Add this to `package.json`:
```json
"prisma": {
  "seed": "node prisma/seed.js"
}
```

---

## Frontend Requirements

### Page Layout (top to bottom)
1. Header — "SkillMap" title, tagline "Skills in demand, updated daily", last updated timestamp
2. Stats row — 3 metric cards: total job postings fetched, total skills tracked, last refresh date
3. Role selector dropdown + job type filter (side by side)
4. Three tabbed panels:
   - Tab 1: Skills Frequency (horizontal bar chart)
   - Tab 2: Trend Over Time (line chart)
   - Tab 3: Skill Gap Checker (checklist + coverage score)
5. Footer — data source credit: Fantastic.jobs via RapidAPI

### Design Guidelines
- Desktop only — min-width 1024px, no mobile layout needed
- Clean minimal aesthetic — white background, no heavy gradients or shadows
- Single accent color for all chart fills — muted blue (#378ADD) or teal (#1D9E75)
- All charts must have clear titles, axis labels, and percentage annotations
- Sufficient color contrast for accessibility (WCAG AA minimum)
- No onboarding or instructions required — interface must be immediately intuitive

### Chart Specifications

**Skills Frequency (Tab 1)**
- Type: Horizontal bar chart (Chart.js)
- Shows: Top 10 skills for selected role
- Labels: Skill name on Y axis, percentage on X axis
- Annotation: Percentage value displayed at end of each bar
- Trigger: Re-renders on role or job type filter change

**Trend Over Time (Tab 2)**
- Type: Line chart (Chart.js)
- Shows: Frequency of top 5 skills over past 30 days
- X axis: Dates, Y axis: Frequency percentage
- Each skill = one line with a distinct color
- Trigger: Re-renders on role change

**Skill Gap Checker (Tab 3)**
- Type: Interactive checklist
- Shows: Top 10 skills for selected role
- Interaction: User checks off skills they already have
- Output: Dynamic coverage score e.g. "6 of 10 skills covered (60%)"
- Persistence: Checkbox states saved to localStorage by role key
- Trigger: Checklist updates on role change, scores recalculate on checkbox change

---

## Vercel Configuration

```json
{
  "rewrites": [
    { "source": "/api/skills", "destination": "/api/skills.js" },
    { "source": "/api/trends", "destination": "/api/trends.js" },
    { "source": "/api/scrape", "destination": "/api/scrape.js" }
  ]
}
```

---

## Cron Job (Weekly Rotating)

The weekly refresh runs every Monday at midnight via node-cron in `scripts/cron.js`:

```javascript
cron.schedule('0 0 * * 1', async () => {
  // 1. Determine which roles to fetch this week (rotating cycle)
  // 2. Fetch from Fantastic.jobs for those roles with location=Ontario,Canada
  // 3. Transform and normalize keywords (one skill per job posting, no duplicates)
  // 4. Save new dated snapshot to MongoDB via Prisma
  // 5. Update ApiQuota with remaining requests/jobs
  // 6. Log quota status and fetch results to console
});
```

**Rotation schedule:**
- Week 1 (Day 1): UI/UX Designer, Product Designer
- Week 2 (Day 8): Graphic Designer, Experiential Designer
- Week 3 (Day 15): Digital Designer, Visual Designer
- Week 4 (Day 22): Multidisciplinary Designer
- Week 5 (Day 29): Restart cycle with UI/UX + Product

The cron job must run independently of any user action — never trigger it from the frontend.

---

## Important Rules

1. **Never hardcode chart data** — always fetch from the API on page load and on every filter change
2. **Never use Mongoose** — use Prisma Client exclusively for all MongoDB operations
3. **Never run `prisma migrate dev`** — use `npx prisma db push` for MongoDB
4. **Never commit `.env`** — add it to `.gitignore` immediately
5. **Always run `npx prisma generate`** after any changes to `schema.prisma`
6. **Always add 1-2 second delays between RapidAPI calls** to avoid rate limiting
7. **All three panels must update without a page reload** when filters change
8. **Comment all code clearly** — explain each step of the pipeline in plain English
9. **Track API quota after every request** — store remaining requests/jobs in ApiQuota model and log to console
10. **Skill counting is per-posting** — a skill mentioned 3 times in one job description still counts as 1 skill for that posting
11. **Weekly rotation is mandatory** — never query all 7 roles in a single cron run (would exceed quota)

---

## Common Commands

```bash
# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Push schema to MongoDB
npx prisma db push

# Seed the database with mock data
npx prisma db seed

# Start the development server
node server/index.js

# Manually trigger a scrape (for testing)
node scripts/fetch.js

# Deploy to Vercel
vercel deploy
```

---

## README Checklist

The `README.md` must include:
- Project description and purpose
- Prerequisites (Node.js version, MongoDB Atlas account, RapidAPI account)
- How to clone and install dependencies
- How to configure `.env`
- How to run `npx prisma db push` and `npx prisma db seed`
- How to start the local development server
- How to manually trigger a scrape for testing
- How to deploy to Vercel
- Data source credits
