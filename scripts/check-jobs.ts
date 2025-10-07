import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

async function checkJobs() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("❌ Missing environment variables");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log("📋 Recent jobs in database:\n");

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select(`
      *,
      documents (
        filename,
        status
      )
    `)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("❌ Error fetching jobs:", error.message);
    return;
  }

  if (!jobs || jobs.length === 0) {
    console.log("No jobs found.");
    return;
  }

  jobs.forEach((job, i) => {
    console.log(`${i + 1}. Job ${job.id}`);
    console.log(`   Document: ${(job.documents as any)?.filename || "Unknown"}`);
    console.log(`   Kind: ${job.kind}`);
    console.log(`   Status: ${job.status}`);
    console.log(`   Created: ${new Date(job.created_at).toLocaleString()}`);
    console.log(`   Updated: ${new Date(job.updated_at).toLocaleString()}`);
    if (job.error) {
      console.log(`   Error: ${job.error}`);
    }
    console.log();
  });

  // Summary
  const queuedCount = jobs.filter((j) => j.status === "queued").length;
  const runningCount = jobs.filter((j) => j.status === "running").length;
  const doneCount = jobs.filter((j) => j.status === "done").length;
  const errorCount = jobs.filter((j) => j.status === "error").length;

  console.log("📊 Summary:");
  console.log(`   Queued: ${queuedCount}`);
  console.log(`   Running: ${runningCount}`);
  console.log(`   Done: ${doneCount}`);
  console.log(`   Error: ${errorCount}`);
}

checkJobs();

