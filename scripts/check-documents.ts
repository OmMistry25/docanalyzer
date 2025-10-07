import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

async function checkDocuments() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("❌ Missing environment variables");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log("📋 Recent documents in database:\n");

  const { data: documents, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("❌ Error fetching documents:", error.message);
    return;
  }

  if (!documents || documents.length === 0) {
    console.log("No documents found.");
    return;
  }

  documents.forEach((doc, i) => {
    console.log(`${i + 1}. Document ${doc.id}`);
    console.log(`   Filename: ${doc.filename}`);
    console.log(`   Status: ${doc.status}`);
    console.log(`   Size: ${(doc.size_bytes / 1024).toFixed(2)} KB`);
    console.log(`   Created: ${new Date(doc.created_at).toLocaleString()}`);
    console.log(`   Expires: ${new Date(doc.expires_at).toLocaleString()}`);
    console.log();
  });
}

checkDocuments();

