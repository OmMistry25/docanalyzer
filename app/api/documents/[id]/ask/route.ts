import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: documentId } = await context.params;
    const body = await request.json();
    const { question, conversationHistory = [] } = body;

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    // Fetch document and extraction data
    const { data: document, error: docError } = await supabaseAdmin
      .from("documents")
      .select("filename, mime, detected_type")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const { data: extraction, error: extractionError } = await supabaseAdmin
      .from("extractions")
      .select("fields, insights")
      .eq("document_id", documentId)
      .single();

    if (extractionError || !extraction) {
      return NextResponse.json(
        { error: "Extraction data not found" },
        { status: 404 }
      );
    }

    // Build context from extraction
    const extractionContext = JSON.stringify(extraction.fields, null, 2);

    // Build conversation messages
    const messages: any[] = [
      {
        role: "system",
        content: `You are a helpful assistant answering questions about a document. Here is the extracted information from the document:

Document Type: ${document.detected_type || "Unknown"}
Filename: ${document.filename}

Extracted Data:
${extractionContext}

Answer questions based on this information. Be concise, accurate, and helpful. If the information isn't in the extraction, say so clearly.`,
      },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: "user",
        content: question,
      },
    ];

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const answer = completion.choices[0]?.message?.content || "I couldn't generate an answer.";

    return NextResponse.json({
      answer,
      conversationHistory: [
        ...conversationHistory,
        { role: "user", content: question },
        { role: "assistant", content: answer },
      ],
    });
  } catch (error) {
    console.error("Q&A error:", error);
    return NextResponse.json(
      { error: "Failed to answer question" },
      { status: 500 }
    );
  }
}

