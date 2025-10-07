import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import OpenAI from "openai";
import { DocumentInsightsSchema, EXTRACTION_PROMPT } from "./extraction-schemas";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

if (!openaiApiKey) {
  console.error("❌ Missing OPENAI_API_KEY environment variable");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

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
 * Download file from storage using signed URL
 */
async function downloadFile(storagePath: string): Promise<Buffer> {
  console.log(`   📥 Downloading file...`);

  // Generate signed download URL (valid for 1 hour)
  const { data: signedUrl, error: urlError } = await supabase.storage
    .from("docs")
    .createSignedUrl(storagePath, 3600);

  if (urlError || !signedUrl) {
    throw new Error(`Failed to generate signed URL: ${urlError?.message}`);
  }

  // Download file bytes
  const response = await fetch(signedUrl.signedUrl);
  
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  console.log(`   ✓ Downloaded ${(buffer.length / 1024).toFixed(2)} KB`);
  
  return buffer;
}

/**
 * Extract insights from document using OpenAI GPT-4 Vision
 */
async function extractInsights(
  fileBuffer: Buffer,
  mimeType: string
): Promise<any> {
  console.log(`   🤖 Analyzing document with GPT-4 Vision...`);

  // Convert buffer to base64
  const base64Data = fileBuffer.toString("base64");

  // Determine image type
  let imageType = "image/jpeg";
  if (mimeType.includes("png")) imageType = "image/png";
  else if (mimeType.includes("gif")) imageType = "image/gif";
  else if (mimeType.includes("webp")) imageType = "image/webp";

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${imageType};base64,${base64Data}`,
              },
            },
            {
              type: "text",
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Clean and parse JSON
    let cleanedContent = content.trim();
    cleanedContent = cleanedContent.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    
    const parsedInsights = JSON.parse(cleanedContent);
    
    // Validate with Zod schema
    const validated = DocumentInsightsSchema.parse(parsedInsights);
    
    console.log(`   ✓ Extracted insights: ${validated.documentType}`);
    console.log(`   ✓ Key points: ${validated.keyPoints.length}`);
    console.log(`   ✓ Red flags: ${validated.redFlags.length}`);
    
    return validated;
  } catch (error: any) {
    console.error(`   ❌ OpenAI API error:`, error.message);
    throw new Error(`Failed to extract insights: ${error.message}`);
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

    // T15 - Download file using signed URL
    const fileBuffer = await downloadFile(document.storage_path);
    console.log(`   ✓ File downloaded successfully (${fileBuffer.length} bytes)`);

    // Verify file size matches
    if (fileBuffer.length !== document.size_bytes) {
      console.warn(`   ⚠️  Size mismatch: expected ${document.size_bytes}, got ${fileBuffer.length}`);
    } else {
      console.log(`   ✓ File size verified`);
    }

    // T16-T19 - Extract insights using OpenAI GPT-4 Vision
    // This handles: OCR, type detection, structured extraction, and insights generation
    const insights = await extractInsights(fileBuffer, document.mime);

    // Save extraction to database
    const { data: extraction, error: extractionError } = await supabase
      .from("extractions")
      .insert({
        document_id: document.id,
        raw_text: "", // GPT-4 Vision doesn't provide raw text separately
        provider: "openai-gpt4-vision",
        confidence_overall: 0.95, // High confidence for GPT-4
        fields: insights,
        insights: {
          redFlags: insights.redFlags,
          plainEnglish: insights.plainEnglish,
        },
        warnings: insights.redFlags.filter((f: any) => f.severity === "high"),
      })
      .select()
      .single();

    if (extractionError) {
      throw new Error(`Failed to save extraction: ${extractionError.message}`);
    }

    console.log(`   ✓ Extraction saved (ID: ${extraction.id})`);

    // Update document with detected type
    await supabase
      .from("documents")
      .update({
        detected_type: insights.documentType,
        status: "succeeded",
      })
      .eq("id", document.id);

    console.log(`   ✓ Document updated with type: ${insights.documentType}`);

    // TODO: T20 - Save artifacts (optional: save JSON files to storage)

    // Mark as done
    await updateJobStatus(job.id, "done");
    console.log(`   ✅ Job completed successfully`);

    // Log to audit
    await supabase.from("audit_logs").insert({
      action: "job_completed",
      entity: "job",
      entity_id: job.id,
      meta: { 
        document_id: document.id,
        file_size: fileBuffer.length,
        document_type: insights.documentType,
        key_points_count: insights.keyPoints.length,
        red_flags_count: insights.redFlags.length,
      },
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

