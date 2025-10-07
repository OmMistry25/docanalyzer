# DocAnalyzer

Anonymous document analysis with AI-powered insights. Upload documents (insurance cards, utility bills, contracts) with zero signup and get instant, structured information extraction.

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Database Setup

#### Option A: Supabase (Recommended)

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Project Settings > API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` key (keep this secret!)
3. Go to **SQL Editor** in Supabase Dashboard
4. Copy the contents of `migrations/001_initial_schema.sql`
5. Paste and run it in the SQL Editor
6. Verify all 4 tables were created

#### Option B: Local Postgres

```bash
# Start Postgres locally
createdb docanalyzer
psql docanalyzer < migrations/001_initial_schema.sql
```

After setting up, verify the database:

```bash
pnpm verify:db
```

### 3. Storage Setup

#### Supabase Storage

1. In Supabase Dashboard, go to Storage
2. Create two buckets:
   - `docs` (private)
   - `artifacts` (private)
3. Set both buckets to private (no public access)

#### Alternative: AWS S3

Configure S3 buckets with the same names and update environment variables accordingly.

### 4. Environment Variables

Copy `env.example` to `.env.local` and fill in your values:

```bash
cp env.example .env.local
```

### 5. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment to Production

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for complete production deployment guide using:
- **Vercel** for Next.js app hosting
- **Supabase Edge Functions** for background worker
- **Vercel Cron** for automated job processing

Estimated monthly cost: **$30-90** (mostly OpenAI API usage)

## Architecture

See `architecture (13).md` for detailed system design.

## Tasks

See `tasks (13).md` for the MVP build plan.

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind, shadcn/ui
- **Backend**: Next.js API routes, server actions
- **Database**: Postgres (Supabase)
- **Storage**: Supabase Storage
- **Background Worker**: Supabase Edge Functions
- **AI**: OpenAI GPT-4 Vision
