import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: documentId } = await context.params;

    // Fetch extraction data
    const { data: extraction, error } = await supabaseAdmin
      .from("extractions")
      .select("*")
      .eq("document_id", documentId)
      .single();

    if (error || !extraction) {
      return NextResponse.json(
        { error: "Extraction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: extraction.id,
      provider: extraction.provider,
      confidence: extraction.confidence_overall,
      fields: extraction.fields,
      insights: extraction.insights,
      warnings: extraction.warnings,
      createdAt: extraction.created_at,
    });
  } catch (error) {
    console.error("Extraction fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

