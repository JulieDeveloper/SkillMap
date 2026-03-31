# SkillMap

Visualizes in-demand skill trends for design and creative job roles in Ontario, Canada.

## Prerequisites

- Node.js (v18 or higher)
- npm
- MongoDB Atlas account (free tier works)
- RapidAPI account with Fantastic.jobs API access

## Setup

### 1. Clone and Install

```bash
git clone <repo>
cd skillmap
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Then edit `.env` with:
- `DATABASE_URL` — your MongoDB Atlas connection string
- `RAPIDAPI_KEY` — your RapidAPI key
- `RAPIDAPI_HOST` — fantastic-jobs.p.rapidapi.com

### 3. Set Up Database

Generate Prisma Client and push schema to MongoDB:

```bash
npm run prisma:generate
npm run prisma:push
```

### 4. Seed Mock Data (Optional)

Populate the database with 14 days of historical data:

```bash
npm run seed
```

### 5. Start Development Server

```bash
npm run dev
```

Server will run on `http://localhost:3001`

### 6. Manual Test Fetch

To manually trigger an API fetch:

```bash
npm run scrape:test
```

## Deployment

Deploy to Vercel:

```bash
vercel deploy
```

Vercel will automatically configure serverless functions from `/api` directory.

## Data Source

Job postings fetched from [Fantastic.jobs API](https://rapidapi.com/liteapi/api/fantastic-jobs) via RapidAPI.
