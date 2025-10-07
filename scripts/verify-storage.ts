import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

async function verifyStorage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("❌ Missing environment variables");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log("🔍 Checking uploaded files in storage...\n");

  // Get documents from DB
  const { data: documents, error: dbError } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (dbError) {
    console.error("❌ Database error:", dbError.message);
    return;
  }

  if (!documents || documents.length === 0) {
    console.log("No documents found in database.");
    return;
  }

  // Check each document's storage path
  for (const doc of documents) {
    console.log(`📄 Document: ${doc.filename} (${doc.id})`);
    console.log(`   Storage path: ${doc.storage_path}`);
    
    if (doc.storage_path) {
      // Check if file exists in storage
      const { data: files, error: listError } = await supabase.storage
        .from("docs")
        .list(doc.storage_path.split("/").slice(0, -1).join("/"));

      if (listError) {
        console.log(`   ❌ Storage check failed: ${listError.message}`);
      } else {
        const fileName = doc.storage_path.split("/").pop();
        const fileExists = files?.some((f) => f.name === fileName);
        
        if (fileExists) {
          console.log(`   ✅ File exists in storage`);
        } else {
          console.log(`   ⚠️  File not found in storage (may not be uploaded yet)`);
        }
      }
    }
    console.log();
  }
}

verifyStorage();

