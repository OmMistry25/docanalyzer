# tasks.md — MVP build plan (anonymous, frictionless)

Each task is tiny and testable. One concern per task.

## Setup and plumbing

T01. Initialize repo
- Start: `pnpm dlx create-next-app@latest` TypeScript App Router.
- End: `pnpm dev` serves the app.
- Acceptance: App loads at http://localhost:3000.

T02. Install UI and libs
- Start: add Tailwind, shadcn/ui, TanStack Query, Zod.
- End: demo components render.
- Acceptance: `/` shows a Card and Button components.

T03. Provision DB and storage
- Start: create Supabase project or Postgres + S3.
- End: `documents`, `extractions`, `jobs`, `audit_logs` tables exist.
- Acceptance: SQL migrations apply with no errors.

T04. Create storage buckets
- Start: create `docs` and `artifacts` buckets.
- End: buckets exist and are private.
- Acceptance: direct GET without signed URL returns 403.

## Anonymous upload flow

T05. Upload dropzone UI
- Start: implement `UploadDropzone.tsx` with file validation and max size.
- End: file selected preview shows name and size.
- Acceptance: UI rejects >30MB and unsupported formats.

T06. Server endpoint: request upload token
- Start: add `/api/upload/token` that accepts filename, mime, size, captcha token.
- End: endpoint validates captcha and rate limit and returns `document_id`, `session_id`, signed PUT URL, and `expires_at`.
- Acceptance: calling endpoint returns valid signed URL and DB `documents` row with `status='queued'`.

T07. Client: use signed URL to upload
- Start: use browser PUT to signed URL.
- End: file uploads to storage path.
- Acceptance: Storage contains file at `anon/{document_id}/{filename}`.

T08. Enqueue parse job
- Start: server inserts `jobs` row `kind='parse'` after upload callback or client notify.
- End: `jobs` row exists with `queued`.
- Acceptance: worker can pick up job by querying `jobs`.

T09. Job status polling
- Start: document detail page polls `/api/documents/{id}/status`.
- End: UI shows `queued`, `processing`, `succeeded`, `failed`.
- Acceptance: status updates reflect DB `jobs` status.

## Abuse protection

T10. Integrate CAPTCHA
- Start: pick reCAPTCHA or hCaptcha.
- End: token required by `/api/upload/token`.
- Acceptance: token verified server-side. Requests without valid token rejected.

T11. Rate limiter
- Start: implement Redis-backed limiter per IP with thresholds.
- End: server returns 429 when exceeded and increases friction.
- Acceptance: repeat upload attempts trigger 429.

T12. Malware scan step
- Start: worker calls virus scanner on downloaded file.
- End: flagged files set job status `error` and move to review queue.
- Acceptance: test malicious sample triggers error and blocks further processing.

T13. Content moderation
- Start: simple regex and LLM-based safety check on OCR text.
- End: flagged documents are marked and placed into manual review.
- Acceptance: flagged doc shows `requires_review` in audit log.

## Parse worker

T14. Worker scaffold
- Start: create serverless worker or Supabase Function `parse-worker`.
- End: worker can run and read `jobs`.
- Acceptance: worker prints `job start` locally.

T15. Signed download
- Start: worker generates signed GET URL for file path.
- End: worker downloads file bytes.
- Acceptance: file bytes match original upload.

T16. OCR
- Start: call provider OCR or fallback Tesseract.
- End: `ocr.txt` created and stored in artifacts.
- Acceptance: for an image PDF, `ocr.txt` contains extracted text.

T17. Type detection
- Start: implement heuristics + LLM classification.
- End: `detected_type` saved on `documents`.
- Acceptance: sample insurance card gets `insurance_card`.

T18. Structured extraction
- Start: call LLM with strict JSON schema for detected type.
- End: validated JSON stored in `extractions.fields`.
- Acceptance: Zod validation passes and row inserted.

T19. Insights engine
- Start: implement rules for each doc type.
- End: `insights` JSON saved with severity levels.
- Acceptance: sample doc returns at least 2 insights.

T20. Persist artifacts and summary
- Start: save `extraction.json`, `insights.json`, `ocr.txt`, and `summary.pdf`.
- End: artifacts exist in `artifacts/{document_id}`.
- Acceptance: UI can fetch and display artifact list.

T21. Update job status and audit
- Start: worker updates `jobs.status` and inserts audit log entries.
- End: `jobs` switched to `done` or `error`.
- Acceptance: UI reflects final state.

## UI and UX

T22. Document list and detail
- Start: implement simple landing with recent uploads and search by `document_id`.
- End: clicking item opens detail page.
- Acceptance: detail page shows status and summary.

T23. Summary and insights UI
- Start: present top fields, confidences, and insights.
- End: insights clickable to reveal supporting text.
- Acceptance: no console errors and layout is responsive.

T24. Download and delete
- Start: provide download button for summary PDF and delete button.
- End: delete calls `/api/documents/{id}/delete` requiring `session_id` or passphrase.
- Acceptance: after delete, storage objects and DB rows removed or marked deleted.

T25. Persistent link / export option
- Start: implement optional "Create link" flow that generates one-time token or passphrase.
- End: server returns shareable URL with TTL.
- Acceptance: access via that URL shows the summary without captcha for the TTL.

## Privacy and retention

T26. Auto-delete job
- Start: scheduled cron to delete expired `documents`.
- End: expired rows and artifacts removed after `expires_at`.
- Acceptance: doc uploaded with `expires_at=now+7d` is removed after job runs.

T27. Immediate delete endpoint
- Start: `/api/documents/{id}/delete` that validates `session_id` or passphrase.
- End: deletion removes artifacts and DB entries.
- Acceptance: subsequent fetch returns 404.

## Monitoring and ops

T28. Sentry and metrics
- Start: configure Sentry in server and client.
- End: test error appears in Sentry.
- Acceptance: trace includes `document_id`.

T29. Admin review UI
- Start: small admin page protected by an environment token for flagged docs.
- End: admin can view flagged docs and mark as safe or delete.
- Acceptance: admin actions recorded in `audit_logs`.

## Acceptance notes
- No user accounts created anywhere.
- All access is via `document_id` + `session_id` or share token.
- Rate limits, captcha, and malware scanning are mandatory steps to compensate for anonymous access.
