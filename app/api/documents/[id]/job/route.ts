import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: documentId } = await context.params;

    // Verify document exists
    const { data: document, error: docError } = await supabaseAdmin
      .from("documents")
      .select("id, status")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Check if job already exists
    const { data: existingJob } = await supabaseAdmin
      .from("jobs")
      .select("id, status")
      .eq("document_id", documentId)
      .eq("kind", "parse")
      .single();

    if (existingJob) {
      return NextResponse.json({
        message: "Job already exists",
        jobId: existingJob.id,
        status: existingJob.status,
      });
    }

    // Create parse job
    const { data: job, error: jobError } = await supabaseAdmin
      .from("jobs")
      .insert({
        document_id: documentId,
        kind: "parse",
        status: "queued",
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error("Failed to create job:", jobError);
      return NextResponse.json(
        { error: "Failed to create job" },
        { status: 500 }
      );
    }

    // Log to audit trail
    await supabaseAdmin.from("audit_logs").insert({
      action: "job_created",
      entity: "job",
      entity_id: job.id,
      meta: { document_id: documentId, kind: "parse" },
    });

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      createdAt: job.created_at,
    });
  } catch (error) {
    console.error("Job creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

