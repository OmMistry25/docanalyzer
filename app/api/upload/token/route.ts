import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { generateSessionId } from "@/lib/session";

const uploadTokenSchema = z.object({
  filename: z.string().min(1).max(255),
  mime: z.string().min(1),
  size: z.number().positive().max(30 * 1024 * 1024), // 30MB max
  captchaToken: z.string().optional(), // Will be required in T10
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = uploadTokenSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { filename, mime, size } = validation.data;

    // TODO: T10 - Validate captcha token
    // TODO: T11 - Check rate limits

    // Generate session ID for anonymous tracking
    const sessionId = generateSessionId();

    // Create document record in database
    const { data: document, error: dbError } = await supabaseAdmin
      .from("documents")
      .insert({
        session_id: sessionId,
        filename,
        mime,
        size_bytes: size,
        storage_path: "", // Will be updated after we generate the path
        status: "queued",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      })
      .select()
      .single();

    if (dbError || !document) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: "Failed to create document record" },
        { status: 500 }
      );
    }

    // Generate storage path
    const fileExtension = filename.split(".").pop() || "bin";
    const storagePath = `anon/${document.id}/original.${fileExtension}`;

    // Update document with storage path
    const { error: updateError } = await supabaseAdmin
      .from("documents")
      .update({ storage_path: storagePath })
      .eq("id", document.id);

    if (updateError) {
      console.error("Failed to update storage path:", updateError);
      // Continue anyway - we can still upload the file
    }

    // Generate signed upload URL (valid for 5 minutes)
    const { data: signedUrl, error: storageError } = await supabaseAdmin.storage
      .from("docs")
      .createSignedUploadUrl(storagePath, {
        upsert: false,
      });

    if (storageError || !signedUrl) {
      console.error("Storage error:", storageError);
      
      // Clean up the document record
      await supabaseAdmin.from("documents").delete().eq("id", document.id);
      
      return NextResponse.json(
        { error: "Failed to generate upload URL" },
        { status: 500 }
      );
    }

    // Log to audit trail
    await supabaseAdmin.from("audit_logs").insert({
      action: "upload_token_requested",
      entity: "document",
      entity_id: document.id,
      meta: { filename, mime, size, session_id: sessionId },
    });

    // Return upload token and document info
    return NextResponse.json({
      documentId: document.id,
      sessionId,
      uploadUrl: signedUrl.signedUrl,
      token: signedUrl.token,
      path: signedUrl.path,
      expiresAt: document.expires_at,
    });
  } catch (error) {
    console.error("Upload token error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

