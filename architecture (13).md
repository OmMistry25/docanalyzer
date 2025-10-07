# Architecture: Document Insight Webapp (Anonymous / Frictionless)

## Product overview
Users upload documents (insurance cards, utility bills, privacy policies, contracts) with zero signup. The app extracts text, runs type-specific extractors, and shows human-readable insights and risk flags. All uploads are ephemeral by default. Optional persistent export via passphrase or emailed link is available but not required.

## Goals
- Zero friction upload and viewing.
- Robust abuse protection and rate limits.
- Clear privacy defaults and retention controls.
- Accurate field extraction per document type.

## Tech stack
- Frontend: Next.js App Router, TypeScript, Tailwind, shadcn/ui, React Hook Form, Zod, TanStack Query.
- Backend: Next.js server actions and API routes, Supabase Postgres for structured storage or Postgres elsewhere, Supabase Storage or S3 for files, background worker (Supabase Function or serverless worker) for parsing.
- OCR / LLM: Google Vision or AWS Textract primary. Tesseract fallback. LLMs via OpenAI or Anthropic for structured JSON output.
- Abuse protection: reCAPTCHA / hCaptcha, rate limiter (Redis), malware scan.
- Observability: Sentry, OpenTelemetry.

## High level flow
1. User visits site. No login required.
2. User drops file. Client requests a short-lived upload token from server.
3. Server validates client (captcha, rate limits). Server creates a `document` row with ephemeral `session_id` and returns signed upload URL.
4. Client uploads file directly to Storage.
5. Server enqueues parse job referencing `document_id`.
6. Worker fetches file via signed URL, runs OCR, detects type, extracts fields, generates insights, saves artifacts.
7. UI polls job status and displays extracted fields and insights.
8. User can download summary PDF or JSON. Optionally set a one-time passphrase or provide email to receive a link. No account required.

## Data model (minimal)
- `documents`
  - `id` uuid pk
  - `session_id` text nullable  # ephemeral id stored in cookie or shown to user
  - `filename` text, `mime` text, `size_bytes` bigint
  - `storage_path` text
  - `status` text check ('queued','processing','succeeded','failed')
  - `detected_type` text
  - `created_at`, `expires_at` timestamptz
- `extractions`
  - `id` uuid pk, `document_id` uuid fk
  - `raw_text` text
  - `provider` text
  - `confidence_overall` numeric
  - `fields` jsonb
  - `insights` jsonb
  - `warnings` jsonb
  - `created_at` timestamptz
- `jobs`
  - `id` uuid pk, `document_id` uuid fk
  - `kind` text check in ('parse','reparse')
  - `status` text check in ('queued','running','done','error')
  - `error` text, `created_at`, `updated_at` timestamptz
- `audit_logs`
  - `id` uuid pk, `action` text, `entity` text, `entity_id` uuid, `meta` jsonb, `at` timestamptz

Notes
- No profiles table. No persistent user id unless user opts in.
- `session_id` is an opaque string shown to user to reaccess results during retention window.
- `expires_at` controls automatic deletion.

## Storage layout
- bucket `docs`: `anon/{document_id}/{original.ext}`
- bucket `artifacts`: `anon/{document_id}/` containing `ocr.txt`, `extraction.json`, `summary.pdf`

## Upload and access model
- Server issues short-lived signed PUT URL after captcha and rate-limit checks.
- Uploaded files accessible only via signed URLs.
- UI receives `document_id` and `session_id`. Store session_id in localStorage for later access.
- Optionally allow "create persistent link" which generates a one-time token or passphrase. If user supplies email, send link then delete email record after sending.

## Abuse protection and limits
- CAPTCHA on first upload per IP. Progressive friction for repeated uploads.
- Redis-backed rate limiter per IP and per session_id.
- File size cap (e.g., 30 MB). Reject certain file types.
- Virus/malware scan in worker before processing.
- Content moderation filter and manual review queue for flagged content.
- Logging and throttle alerts to admins.

## Privacy and retention
- Default retention: 7 days auto-delete. Configurable per deployment.
- Deletion endpoint: provide `document_id` and `session_id` or passphrase to delete immediately.
- PII minimization: redact sensitive tokens in previews. Do not store full raw_text beyond extraction unless necessary. Offer opt-out and deletion.
- Export links can be single-use and time-limited.

## Worker and extraction
- Worker steps: download file, detect text vs image, OCR if needed, layout analysis, type detection, structured extraction (LLM with JSON schema), apply rule engine for insights, save artifacts.
- On extraction failure, worker retries with fallback prompt or provider.

## Security
- No user auth reduces attack surface but increases abuse risk. Compensate with rate limits, captcha, moderation.
- Signed URLs only. Service role keys never exposed to client.
- TLS everywhere.
- Audit logs for admin review.

## Observability
- Sentry for errors.
- Job metrics for parse time and failure rates.
- Dashboard for upload rates, flagged content, and deletion requests.

## Local dev
- Supabase CLI or local Postgres for DB and Storage emulation.
- ENV flags for retention and abuse thresholds.

## Future extensions
- Optional lightweight accounts for power users.
- Team/organization features behind auth.
- Fine tuned extractors for vendors and enterprise connectors.
