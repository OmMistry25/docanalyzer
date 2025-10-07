import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

interface Job {
  id: string;
  document_id: string;
  kind: string;
  status: string;
  created_at: string;
}

interface Document {
  id: string;
  filename: string;
  mime: string;
  storage_path: string;
  size_bytes: number;
}

/**
 * Update job status
 */
async function updateJobStatus(
  jobId: string,
  status: "running" | "done" | "error",
  error?: string
) {
  const { error: updateError } = await supabase
    .from("jobs")
    .update({
      status,
      error: error || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (updateError) {
    console.error(`Failed to update job ${jobId}:`, updateError.message);
  }
}

/**
 * Process a single parse job
 */
async function processJob(job: Job, document: Document) {
  console.log(`\n📄 Processing job ${job.id}`);
  console.log(`   Document: ${document.filename}`);
  console.log(`   MIME type: ${document.mime}`);
  console.log(`   Size: ${(document.size_bytes / 1024).toFixed(2)} KB`);
  console.log(`   Storage path: ${document.storage_path}`);

  try {
    // Update job to running
    await updateJobStatus(job.id, "running");
    console.log(`   Status: running`);

    // TODO: T15 - Download file using signed URL
    // TODO: T16 - Run OCR
    // TODO: T17 - Detect document type
    // TODO: T18 - Extract structured data
    // TODO: T19 - Generate insights
    // TODO: T20 - Save artifacts

    // For now, just simulate processing
    console.log(`   Processing...`);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mark as done
    await updateJobStatus(job.id, "done");
    console.log(`   ✅ Job completed successfully`);

    // Log to audit
    await supabase.from("audit_logs").insert({
      action: "job_completed",
      entity: "job",
      entity_id: job.id,
      meta: { document_id: document.id },
    });
  } catch (error: any) {
    console.error(`   ❌ Job failed:`, error.message);
    await updateJobStatus(job.id, "error", error.message);
  }
}

/**
 * Poll for queued jobs and process them
 */
async function pollJobs() {
  console.log("🔍 Checking for queued jobs...");

  // Fetch queued parse jobs
  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select(`
      id,
      document_id,
      kind,
      status,
      created_at
    `)
    .eq("kind", "parse")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(5);

  if (jobsError) {
    console.error("Failed to fetch jobs:", jobsError.message);
    return;
  }

  if (!jobs || jobs.length === 0) {
    console.log("No queued jobs found.");
    return;
  }

  console.log(`Found ${jobs.length} queued job(s)`);

  // Process each job
  for (const job of jobs) {
    // Fetch document details
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("id, filename, mime, storage_path, size_bytes")
      .eq("id", job.document_id)
      .single();

    if (docError || !document) {
      console.error(`Failed to fetch document for job ${job.id}`);
      await updateJobStatus(job.id, "error", "Document not found");
      continue;
    }

    await processJob(job as Job, document as Document);
  }
}

/**
 * Main worker loop
 */
async function startWorker() {
  console.log("🚀 Parse Worker Started");
  console.log("========================\n");

  // Initial poll
  await pollJobs();

  // Poll every 10 seconds
  const pollInterval = 10000;
  console.log(`\n⏰ Polling every ${pollInterval / 1000} seconds...\n`);

  setInterval(async () => {
    await pollJobs();
  }, pollInterval);
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Worker shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n\n👋 Worker shutting down...");
  process.exit(0);
});

// Start the worker
startWorker().catch((error) => {
  console.error("Worker failed to start:", error);
  process.exit(1);
});

