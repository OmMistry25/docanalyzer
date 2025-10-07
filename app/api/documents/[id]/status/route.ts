import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: documentId } = await context.params;

    // Fetch document with its job status
    const { data: document, error: docError } = await supabaseAdmin
      .from("documents")
      .select(`
        id,
        filename,
        status,
        detected_type,
        created_at,
        expires_at,
        jobs (
          id,
          kind,
          status,
          error,
          created_at,
          updated_at
        )
      `)
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Find the most recent parse job
    const jobs = (document.jobs as any[]) || [];
    const parseJob = jobs.find((j) => j.kind === "parse");

    return NextResponse.json({
      id: document.id,
      filename: document.filename,
      status: document.status,
      detectedType: document.detected_type,
      createdAt: document.created_at,
      expiresAt: document.expires_at,
      job: parseJob
        ? {
            id: parseJob.id,
            status: parseJob.status,
            error: parseJob.error,
            createdAt: parseJob.created_at,
            updatedAt: parseJob.updated_at,
          }
        : null,
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

