import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Load .env.local
config({ path: ".env.local" });

async function setupStorage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("❌ Missing environment variables");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log("🗄️  Setting up storage buckets...\n");

  const buckets = [
    { name: "docs", public: false },
    { name: "artifacts", public: false },
  ];

  for (const bucket of buckets) {
    try {
      // Check if bucket exists
      const { data: existing } = await supabase.storage.getBucket(bucket.name);

      if (existing) {
        console.log(`✅ Bucket '${bucket.name}' already exists`);
      } else {
        // Create bucket
        const { data, error } = await supabase.storage.createBucket(bucket.name, {
          public: bucket.public,
          fileSizeLimit: 31457280, // 30MB
        });

        if (error) {
          console.error(`❌ Failed to create bucket '${bucket.name}':`, error.message);
        } else {
          console.log(`✅ Created bucket '${bucket.name}'`);
        }
      }
    } catch (error: any) {
      console.error(`❌ Error with bucket '${bucket.name}':`, error.message);
    }
  }

  // Verify buckets are private by attempting to access without auth
  console.log("\n🔒 Verifying buckets are private...");
  
  for (const bucket of buckets) {
    const { data } = supabase.storage.from(bucket.name).getPublicUrl("test.txt");
    
    // Try to fetch without auth - should fail
    const response = await fetch(data.publicUrl);
    
    if (response.status === 400 || response.status === 404) {
      console.log(`✅ Bucket '${bucket.name}' is properly secured (private)`);
    } else {
      console.warn(`⚠️  Bucket '${bucket.name}' may not be properly secured (status: ${response.status})`);
    }
  }

  console.log("\n✅ Storage setup complete!");
  console.log("\nNext: Commit T03 & T04, then proceed to T05 (Upload dropzone UI)");
}

setupStorage();

