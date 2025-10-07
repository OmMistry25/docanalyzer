// Supabase Edge Function - Process Job Queue (Cron-based)
// This function runs on a schedule and processes all queued jobs

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import OpenAI from "https://esm.sh/openai@4.28.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

// Document type templates (same as before)
const DOCUMENT_TYPE_TEMPLATES = {
  "Insurance Card": {
    summary: "This is a [ORGANIZATION] [PLAN NAME] insurance card for [SUBSCRIBER NAME], effective [DATE]. It shows copay amounts for different types of medical services. This is an HMO-style plan requiring referrals with PCP [DOCTOR NAME].",
    keyPoints: [
      "Subscriber/Account holder name and ID: [VALUE]",
      "Policy/Group/Account numbers: [VALUE]",
      "Coverage/Effective dates: [VALUE]",
      "Key service costs or terms: [VALUE]",
      "Special requirements or restrictions: [VALUE]",
    ],
    plainEnglish: "This is a managed care health plan where you pay set copay amounts for different medical services. You must choose a primary care doctor who coordinates your care and provides referrals to specialists. Emergency room visits cost $[AMOUNT], encouraging you to use urgent care ($[AMOUNT]) or your primary doctor ($[AMOUNT]) instead. Virtual visits are free to promote telehealth usage.",
  },
  "Utility Bill": {
    summary: "This is a [UTILITY TYPE] bill from [PROVIDER] for [CUSTOMER NAME], billing period [START DATE] to [END DATE]. The total amount due is $[AMOUNT] by [DUE DATE]. Usage for this period was [USAGE AMOUNT].",
    keyPoints: [
      "Account holder name and account number: [VALUE]",
      "Billing period and due date: [VALUE]",
      "Current charges and total amount due: [VALUE]",
      "Usage/consumption amount: [VALUE]",
      "Payment methods available: [VALUE]",
    ],
    plainEnglish: "This is a utility bill showing charges for [SERVICE TYPE] service. Your current balance is $[AMOUNT], which includes charges of $[AMOUNT] for this billing period. Payment is due by [DATE], and you can pay online, by phone, by mail, or in person. Late payments may result in service disconnection or late fees.",
  },
  "Default": {
    summary: "[DOCUMENT TYPE] for [ENTITY/PERSON], [KEY IDENTIFIER]. [MAIN PURPOSE]. [KEY DETAIL].",
    keyPoints: [
      "Primary entity/person: [VALUE]",
      "Key identifiers: [VALUE]",
      "Important dates: [VALUE]",
      "Main terms or amounts: [VALUE]",
      "Special conditions: [VALUE]",
    ],
    plainEnglish: "This document [DESCRIBES WHAT IT IS]. [EXPLAINS KEY TERMS]. [IMPORTANT IMPLICATIONS]. [WHAT USER SHOULD KNOW].",
  },
};

const DOCUMENT_TYPE_DETECTION_PROMPT = `Analyze this document image and determine its type. 

Common types include:
- Insurance Card (health insurance, medical card, HMO/PPO card)
- Utility Bill (electricity, water, gas, internet bill)
- Privacy Policy (terms of service, privacy agreement)
- Employment Contract (job offer, work agreement)
- Other (specify what it is)

Respond with ONLY the document type, nothing else. Be specific but concise.`;

function getExtractionPrompt(documentType: string): string {
  const template = DOCUMENT_TYPE_TEMPLATES[documentType as keyof typeof DOCUMENT_TYPE_TEMPLATES] || DOCUMENT_TYPE_TEMPLATES["Default"];
  
  return `You are a document analyzer that produces CONSISTENT, STRUCTURED output for a ${documentType}. Extract information following these EXACT rules:

IMPORTANT: Use the following template structure for this document type:

Summary Template: ${template.summary}
Key Points Template: ${template.keyPoints.join("; ")}
Plain English Template: ${template.plainEnglish}

Respond ONLY with a valid JSON object in this exact format:

{
  "documentType": "${documentType}",
  "summary": "string (follow template exactly)",
  "keyPoints": ["array of 3-5 items following template format"],
  "criticalDates": [{"date": "YYYY-MM-DD or 'Ongoing'", "description": "string"}],
  "financialDetails": [{"label": "string", "value": "string", "note": "string (optional)"}],
  "importantClauses": [{"title": "string", "description": "string", "significance": "string"}],
  "redFlags": [{"issue": "string", "explanation": "string", "severity": "low|medium|high"}],
  "plainEnglish": "string (follow template exactly, 3-4 sentences)"
}`;
}

async function downloadFile(storagePath: string): Promise<Uint8Array> {
  const bucket = "docs";
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(storagePath);

  if (error || !data) {
    throw new Error(`Failed to download file: ${error?.message}`);
  }

  return new Uint8Array(await data.arrayBuffer());
}

async function extractInsights(
  fileBuffer: Uint8Array,
  mimeType: string
): Promise<{ documentType: string; insights: any }> {
  const base64Data = btoa(String.fromCharCode(...fileBuffer));
  
  let imageType = "image/jpeg";
  if (mimeType.includes("png")) imageType = "image/png";
  else if (mimeType.includes("gif")) imageType = "image/gif";
  else if (mimeType.includes("webp")) imageType = "image/webp";

  // Step 1: Detect document type
  console.log("   🔍 Detecting document type...");
  const typeDetectionResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 50,
    temperature: 0,
    seed: 12345,
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
            text: DOCUMENT_TYPE_DETECTION_PROMPT,
          },
        ],
      },
    ],
  });

  const documentType = typeDetectionResponse.choices[0]?.message?.content?.trim() || "Unknown Document";
  console.log(`   ✓ Detected document type: ${documentType}`);

  // Step 2: Extract with type-specific prompt
  const extractionPrompt = getExtractionPrompt(documentType);
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4000,
    temperature: 0,
    seed: 12345,
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
            text: extractionPrompt,
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

  const insights = JSON.parse(content);
  return { documentType, insights };
}

async function processJob(job: any, document: any) {
  console.log(`📄 Processing job ${job.id}`);
  console.log(`   Document: ${document.filename}`);

  try {
    // Update job status to running
    await supabase
      .from("jobs")
      .update({ status: "running", updated_at: new Date().toISOString() })
      .eq("id", job.id);

    // Download file
    console.log("   📥 Downloading file...");
    const fileBuffer = await downloadFile(document.storage_path);
    console.log(`   ✓ Downloaded ${(fileBuffer.length / 1024).toFixed(2)} KB`);

    // Extract insights
    console.log("   🤖 Analyzing document with GPT-4 Vision...");
    const { documentType, insights } = await extractInsights(fileBuffer, document.mime);
    
    console.log(`   ✓ Extracted insights: ${documentType}`);

    // Save extraction
    const { data: extraction, error: extractionError } = await supabase
      .from("extractions")
      .insert({
        document_id: document.id,
        provider: "openai",
        fields: insights,
        insights: {
          redFlags: insights.redFlags || [],
          keyPoints: insights.keyPoints || [],
        },
        confidence_overall: 0.95,
      })
      .select()
      .single();

    if (extractionError) {
      throw new Error(`Failed to save extraction: ${extractionError.message}`);
    }

    console.log(`   ✓ Extraction saved`);

    // Update document
    await supabase
      .from("documents")
      .update({
        detected_type: documentType,
        status: "succeeded",
        updated_at: new Date().toISOString(),
      })
      .eq("id", document.id);

    // Update job status to done
    await supabase
      .from("jobs")
      .update({
        status: "done",
        result: { extractionId: extraction.id },
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    // Audit log
    await supabase.from("audit_logs").insert({
      action: "job_completed",
      entity: "job",
      entity_id: job.id,
      meta: {
        documentId: document.id,
        documentType,
        extractionId: extraction.id,
      },
    });

    console.log("   ✅ Job completed successfully");
  } catch (error) {
    console.error("   ❌ Error processing job:", error);

    // Update job status to error
    await supabase
      .from("jobs")
      .update({
        status: "error",
        error: error instanceof Error ? error.message : String(error),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);
  }
}

// Main handler - Process all queued jobs
Deno.serve(async (_req) => {
  try {
    console.log("🔍 Checking for queued jobs...");

    // Fetch all queued jobs
    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select("*, documents(*)")
      .eq("kind", "parse")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(5); // Process up to 5 jobs per invocation

    if (jobsError) {
      throw new Error(`Failed to fetch jobs: ${jobsError.message}`);
    }

    if (!jobs || jobs.length === 0) {
      console.log("No queued jobs found.");
      return new Response(
        JSON.stringify({ message: "No queued jobs", processed: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${jobs.length} queued job(s)`);

    // Process each job
    const results = [];
    for (const job of jobs) {
      try {
        await processJob(job, job.documents);
        results.push({ jobId: job.id, status: "success" });
      } catch (error) {
        console.error(`Failed to process job ${job.id}:`, error);
        results.push({ 
          jobId: job.id, 
          status: "error", 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${results.length} jobs`, 
        processed: results.length,
        results 
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in edge function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

