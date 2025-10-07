# DocAnalyzer - Production Deployment Guide

This guide walks you through deploying DocAnalyzer to production using Vercel (frontend/API) and Supabase Edge Functions (background worker).

---

## Architecture

- **Frontend & API**: Next.js deployed on Vercel
- **Database**: Supabase Postgres (already set up)
- **Storage**: Supabase Storage (already set up)
- **Background Worker**: Supabase Edge Function (`process-queue`)
- **Cron Trigger**: Vercel Cron → Supabase Edge Function (runs every minute)

---

## Prerequisites

1. **Supabase Account** - https://supabase.com
2. **Vercel Account** - https://vercel.com
3. **OpenAI API Key** - https://platform.openai.com
4. **Supabase CLI** - Install via: `npm install -g supabase`

---

## Step 1: Deploy Supabase Edge Function

### 1.1 Install Supabase CLI

```bash
npm install -g supabase
```

### 1.2 Link to Your Supabase Project

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Find your project ref in your Supabase dashboard URL:
`https://app.supabase.com/project/YOUR_PROJECT_REF`

### 1.3 Set Edge Function Secrets

```bash
# Set OpenAI API key
supabase secrets set OPENAI_API_KEY=sk-your-openai-api-key

# Verify secrets
supabase secrets list
```

### 1.4 Deploy the Edge Function

```bash
supabase functions deploy process-queue
```

Verify deployment:
```bash
supabase functions list
```

### 1.5 Test the Edge Function

```bash
curl -i --location --request POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-queue' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{}'
```

---

## Step 2: Deploy to Vercel

### 2.1 Push to GitHub

```bash
git add .
git commit -m "Add production deployment configuration"
git push origin main
```

### 2.2 Import Project in Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Framework Preset: **Next.js**
4. Root Directory: `.` (leave default)

### 2.3 Configure Environment Variables

In Vercel project settings → Environment Variables, add:

#### Public Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### Secret Variables
```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-api-key
CRON_SECRET=generate-a-random-secret
```

To generate `CRON_SECRET`:
```bash
openssl rand -base64 32
```

### 2.4 Deploy

Click **Deploy** in Vercel dashboard. Your app will be live at:
```
https://your-project.vercel.app
```

---

## Step 3: Set Up Vercel Cron Job

### 3.1 Enable Vercel Cron (Automatic)

The `vercel.json` file already configures a cron job:
```json
{
  "crons": [
    {
      "path": "/api/cron/process-jobs",
      "schedule": "* * * * *"
    }
  ]
}
```

This runs **every minute** and triggers the Supabase Edge Function.

### 3.2 Verify Cron is Active

1. Go to Vercel Dashboard → Your Project → **Cron Jobs**
2. You should see: `process-jobs` running every minute

### 3.3 Test the Cron Endpoint

```bash
curl -i --request GET \
  'https://your-project.vercel.app/api/cron/process-jobs' \
  --header 'Authorization: Bearer YOUR_CRON_SECRET'
```

---

## Step 4: Verify End-to-End

### 4.1 Upload a Document

1. Go to your deployed app: `https://your-project.vercel.app`
2. Upload a document (insurance card, utility bill, etc.)
3. Watch the status change from **Queued** → **Processing** → **Succeeded**

### 4.2 Check Logs

**Vercel Logs:**
```bash
vercel logs YOUR_PROJECT_NAME
```

**Supabase Edge Function Logs:**
1. Go to Supabase Dashboard → Edge Functions → `process-queue` → **Logs**

---

## Step 5: Monitoring & Observability

### 5.1 Supabase Dashboard

Monitor:
- **Database**: Check `jobs`, `documents`, `extractions`, `audit_logs` tables
- **Storage**: Verify files in `docs` bucket
- **Edge Functions**: View invocation logs and errors

### 5.2 Vercel Dashboard

Monitor:
- **Deployment logs**: Build and runtime errors
- **Function logs**: API route performance
- **Cron job logs**: Scheduled invocations

### 5.3 OpenAI Usage

Monitor API usage at: https://platform.openai.com/usage

---

## Cost Estimates

### Free Tier
- **Vercel**: 100GB bandwidth, 100 hours serverless, 1M Edge Function invocations
- **Supabase**: 500MB database, 1GB storage, 2GB bandwidth, 500K Edge Function invocations
- **OpenAI**: Pay-as-you-go (GPT-4 Vision: ~$0.01-0.03 per document)

### Expected Monthly Costs (100 documents/day)
- **Vercel**: Free (well within limits)
- **Supabase**: Free (well within limits)
- **OpenAI**: ~$30-90/month (3000 documents × $0.01-0.03)

**Total: $30-90/month** (mostly OpenAI costs)

---

## Troubleshooting

### Edge Function Not Processing Jobs

**Check:**
1. Edge function is deployed: `supabase functions list`
2. `OPENAI_API_KEY` secret is set: `supabase secrets list`
3. Cron job is hitting the endpoint: Check Vercel cron logs
4. Check edge function logs in Supabase dashboard

**Manual trigger:**
```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-queue \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Documents Stuck in "Queued" Status

**Check:**
1. Cron job is running (Vercel dashboard → Cron Jobs)
2. `CRON_SECRET` is set correctly in Vercel environment variables
3. Edge function is returning 200 OK
4. Check database: `SELECT * FROM jobs WHERE status = 'queued'`

### High OpenAI Costs

**Solutions:**
1. Use `gpt-4o-mini` instead of `gpt-4o` (cheaper, faster)
2. Reduce `max_tokens` in edge function
3. Add usage limits in your app
4. Implement CAPTCHA to prevent abuse (T10-T13 in tasks.md)

---

## Scaling Considerations

### Current Setup (MVP)
- **Throughput**: ~60 documents/hour (1 per minute via cron)
- **Concurrency**: 1 job at a time
- **Cost**: ~$30-90/month

### To Scale Up

**Option 1: Increase Cron Frequency**
- Change `vercel.json` schedule to `*/30 * * * *` (every 30 seconds)
- Process up to 120 documents/hour

**Option 2: Process Multiple Jobs Per Invocation**
- Edge function already processes up to 5 jobs per call
- Increase limit in `supabase/functions/process-queue/index.ts` line 199

**Option 3: Use Database Triggers**
- Apply `migrations/002_job_trigger.sql` (requires pg_net extension)
- Immediate processing (no cron delay)

**Option 4: Separate Worker Service**
- Deploy worker to Railway/Render/Fly.io
- Long-running process with polling (like current `worker/parse-worker.ts`)

---

## Security Checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is secret (not exposed to client)
- [ ] `OPENAI_API_KEY` is secret (not in client code)
- [ ] `CRON_SECRET` is set and verified in cron endpoint
- [ ] Row Level Security (RLS) is enabled on Supabase tables
- [ ] Environment variables are set in Vercel (not in code)
- [ ] `.env.local` is in `.gitignore`
- [ ] No API keys in git history

---

## Next Steps

1. **Implement Remaining Tasks** (from `tasks.md`):
   - T10-T13: Abuse protection (CAPTCHA, rate limiting)
   - T25: Persistent link/export option
   - T26-T27: Auto-delete and retention
   - T28-T29: Monitoring (Sentry) and admin UI

2. **Add Custom Domain** (Vercel):
   - Go to Vercel project → Settings → Domains
   - Add your custom domain (e.g., `docanalyzer.com`)

3. **Enable Analytics**:
   - Vercel Analytics: Built-in, enable in project settings
   - Supabase Analytics: View in dashboard

4. **Set Up Alerts**:
   - Vercel: Configure deployment notifications
   - Supabase: Set up database/storage alerts

---

## Support

- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **OpenAI Docs**: https://platform.openai.com/docs

---

## Quick Reference

### Useful Commands

```bash
# Supabase
supabase functions list
supabase functions deploy process-queue
supabase secrets list
supabase secrets set KEY=value

# Vercel
vercel deploy
vercel env add KEY
vercel logs

# Local Development
pnpm dev          # Start Next.js dev server
pnpm worker       # Start local worker (for testing)
pnpm check:jobs   # Check job queue
pnpm view:extraction  # View latest extraction
```

### URLs

- **Supabase Dashboard**: `https://app.supabase.com/project/YOUR_PROJECT_REF`
- **Vercel Dashboard**: `https://vercel.com/YOUR_USERNAME/YOUR_PROJECT`
- **Production App**: `https://your-project.vercel.app`
- **Edge Function**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-queue`

---

**You're all set!** 🚀

Your DocAnalyzer app is now running in production with:
- ✅ Zero-friction document upload
- ✅ AI-powered analysis with GPT-4 Vision
- ✅ Background processing with Supabase Edge Functions
- ✅ Automatic job queue processing via Vercel Cron
- ✅ Scalable, serverless architecture

