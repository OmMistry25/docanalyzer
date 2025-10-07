import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Load .env.local
config({ path: ".env.local" });

async function verifyDatabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("❌ Missing environment variables:");
    console.error("   - NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✓" : "✗");
    console.error("   - SUPABASE_SERVICE_ROLE_KEY:", serviceRoleKey ? "✓" : "✗");
    console.error("\nFound env keys:", Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    console.error("\nPlease ensure .env.local has:");
    console.error("NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co");
    console.error("SUPABASE_SERVICE_ROLE_KEY=your-service-role-key");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log("🔍 Verifying database connection...\n");

  try {
    // Check each table exists
    const tables = ["documents", "extractions", "jobs", "audit_logs"];
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });

      if (error) {
        console.error(`❌ Table '${table}' check failed:`, error.message);
        process.exit(1);
      }
      console.log(`✅ Table '${table}' exists (${count || 0} rows)`);
    }

    console.log("\n✅ All database tables verified successfully!");
    console.log("\nNext: Run the storage bucket verification or proceed to T04.");
  } catch (error) {
    console.error("❌ Database verification failed:", error);
    process.exit(1);
  }
}

verifyDatabase();

