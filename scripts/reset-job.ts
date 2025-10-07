import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

async function resetJob() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("❌ Missing environment variables");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Get the most recent job
  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!job) {
    console.log("No jobs found");
    return;
  }

  console.log(`Resetting job ${job.id} to queued...`);

  // Reset to queued
  await supabase
    .from("jobs")
    .update({ status: "queued", error: null })
    .eq("id", job.id);

  // Delete any existing extraction
  await supabase
    .from("extractions")
    .delete()
    .eq("document_id", job.document_id);

  console.log("✅ Job reset! Start the worker to reprocess.");
}

resetJob();

