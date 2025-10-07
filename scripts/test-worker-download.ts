import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

async function testDownload() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("❌ Missing environment variables");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log("🧪 Testing file download from storage...\n");

  // Get the most recent document
  const { data: document, error: docError } = await supabase
    .from("documents")
    .select("id, filename, storage_path, size_bytes")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (docError || !document) {
    console.error("❌ No documents found");
    process.exit(1);
  }

  console.log(`Document: ${document.filename}`);
  console.log(`Storage path: ${document.storage_path}`);
  console.log(`Expected size: ${(document.size_bytes / 1024).toFixed(2)} KB\n`);

  // Generate signed URL
  const { data: signedUrl, error: urlError } = await supabase.storage
    .from("docs")
    .createSignedUrl(document.storage_path, 3600);

  if (urlError || !signedUrl) {
    console.error("❌ Failed to generate signed URL:", urlError?.message);
    process.exit(1);
  }

  console.log("✅ Signed URL generated");
  console.log(`URL: ${signedUrl.signedUrl.substring(0, 80)}...\n`);

  // Download file
  console.log("📥 Downloading file...");
  const response = await fetch(signedUrl.signedUrl);

  if (!response.ok) {
    console.error(`❌ Download failed: ${response.statusText}`);
    process.exit(1);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  console.log(`✅ Downloaded ${(buffer.length / 1024).toFixed(2)} KB`);

  // Verify size
  if (buffer.length === document.size_bytes) {
    console.log(`✅ File size matches expected size`);
  } else {
    console.warn(`⚠️  Size mismatch: expected ${document.size_bytes}, got ${buffer.length}`);
  }

  console.log("\n✅ Download test completed successfully!");
}

testDownload();

