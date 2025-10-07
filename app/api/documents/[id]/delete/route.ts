import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: documentId } = await context.params;
    
    // Get session_id from request body
    const body = await request.json();
    const { session_id } = body;

    if (!session_id) {
      return NextResponse.json(
        { error: "session_id is required" },
        { status: 400 }
      );
    }

    // Verify document exists and session_id matches
    const { data: document, error: docError } = await supabaseAdmin
      .from("documents")
      .select("id, session_id, storage_path")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Validate session ownership
    if (document.session_id !== session_id) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid session" },
        { status: 403 }
      );
    }

    // Delete from storage (docs bucket)
    if (document.storage_path) {
      const { error: storageError } = await supabaseAdmin.storage
        .from("docs")
        .remove([document.storage_path]);

      if (storageError) {
        console.error("Storage deletion error:", storageError);
        // Continue anyway - we want to delete DB records even if storage fails
      }
    }

    // Delete extractions
    const { error: extractionsError } = await supabaseAdmin
      .from("extractions")
      .delete()
      .eq("document_id", documentId);

    if (extractionsError) {
      console.error("Extractions deletion error:", extractionsError);
    }

    // Delete jobs
    const { error: jobsError } = await supabaseAdmin
      .from("jobs")
      .delete()
      .eq("document_id", documentId);

    if (jobsError) {
      console.error("Jobs deletion error:", jobsError);
    }

    // Delete document record
    const { error: deleteError } = await supabaseAdmin
      .from("documents")
      .delete()
      .eq("id", documentId);

    if (deleteError) {
      console.error("Document deletion error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete document" },
        { status: 500 }
      );
    }

    // Audit log
    await supabaseAdmin.from("audit_logs").insert({
      event_type: "document.deleted",
      user_identifier: `session:${session_id}`,
      document_id: documentId,
      metadata: { deleted_at: new Date().toISOString() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

