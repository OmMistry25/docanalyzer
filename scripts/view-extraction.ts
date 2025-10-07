import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

async function viewExtraction() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("❌ Missing environment variables");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log("📊 Most Recent Extraction Results:\n");

  const { data: extraction, error } = await supabase
    .from("extractions")
    .select(`
      *,
      documents (
        filename,
        detected_type
      )
    `)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !extraction) {
    console.log("No extractions found yet. Upload a document and wait for processing.");
    return;
  }

  const fields = extraction.fields as any;
  const doc = extraction.documents as any;

  console.log("═══════════════════════════════════════════════════════");
  console.log(`📄 Document: ${doc.filename}`);
  console.log(`🏷️  Type: ${doc.detected_type}`);
  console.log(`🤖 Provider: ${extraction.provider}`);
  console.log(`📅 Extracted: ${new Date(extraction.created_at).toLocaleString()}`);
  console.log("═══════════════════════════════════════════════════════\n");

  console.log("📝 SUMMARY:");
  console.log(fields.summary);
  console.log();

  if (fields.keyPoints && fields.keyPoints.length > 0) {
    console.log("✨ KEY POINTS:");
    fields.keyPoints.forEach((point: string, i: number) => {
      console.log(`  ${i + 1}. ${point}`);
    });
    console.log();
  }

  if (fields.criticalDates && fields.criticalDates.length > 0) {
    console.log("📅 CRITICAL DATES:");
    fields.criticalDates.forEach((item: any) => {
      console.log(`  • ${item.date}: ${item.description}`);
    });
    console.log();
  }

  if (fields.financialDetails && fields.financialDetails.length > 0) {
    console.log("💰 FINANCIAL DETAILS:");
    fields.financialDetails.forEach((item: any) => {
      console.log(`  • ${item.label}: ${item.value}`);
      if (item.note) console.log(`    └─ ${item.note}`);
    });
    console.log();
  }

  if (fields.importantClauses && fields.importantClauses.length > 0) {
    console.log("📋 IMPORTANT CLAUSES:");
    fields.importantClauses.forEach((clause: any) => {
      console.log(`  • ${clause.title}`);
      console.log(`    ${clause.description}`);
      console.log(`    ⚠️  ${clause.significance}`);
    });
    console.log();
  }

  if (fields.redFlags && fields.redFlags.length > 0) {
    console.log("🚩 RED FLAGS:");
    fields.redFlags.forEach((flag: any) => {
      const icon = flag.severity === "high" ? "🔴" : flag.severity === "medium" ? "🟡" : "🟢";
      console.log(`  ${icon} [${flag.severity.toUpperCase()}] ${flag.issue}`);
      console.log(`     ${flag.explanation}`);
    });
    console.log();
  }

  if (fields.plainEnglish) {
    console.log("💬 PLAIN ENGLISH:");
    console.log(fields.plainEnglish);
    console.log();
  }

  console.log("═══════════════════════════════════════════════════════");
}

viewExtraction();

