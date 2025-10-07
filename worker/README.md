# Parse Worker

This directory contains the background worker that processes document parse jobs.

## Running Locally

```bash
pnpm worker
```

The worker will:
1. Poll the `jobs` table every 10 seconds
2. Pick up jobs with `status='queued'` and `kind='parse'`
3. Update job status to `running`
4. Process the document (download, OCR, extract, generate insights)
5. Update job status to `done` or `error`

## How It Works

1. **Job Polling**: Queries database for queued parse jobs
2. **Job Processing**: 
   - Fetches document metadata
   - Downloads file from storage (T15)
   - Runs OCR if needed (T16)
   - Detects document type (T17)
   - Extracts structured data (T18)
   - Generates insights (T19)
   - Saves artifacts (T20)
3. **Status Updates**: Updates job status in real-time
4. **Error Handling**: Catches errors and marks jobs as failed

## Deployment

For production, you can deploy this as:
- **Supabase Edge Function**: Triggered on job creation
- **AWS Lambda**: Scheduled or event-driven
- **Cloud Run**: Long-running container
- **Docker**: Self-hosted worker service

## Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional (for processing):
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_CLOUD_VISION_KEY`

