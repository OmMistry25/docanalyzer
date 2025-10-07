import { NextRequest, NextResponse } from "next/server";

// Vercel Cron Job endpoint to trigger Supabase Edge Function
// This endpoint is called every minute by Vercel's cron system

export async function GET(request: NextRequest) {
  // Verify this is a legitimate cron request from Vercel
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    // Call the Supabase Edge Function
    const response = await fetch(
      `${supabaseUrl}/functions/v1/process-queue`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({}),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Edge function error:", error);
      return NextResponse.json(
        { error: "Failed to invoke edge function", details: error },
        { status: 500 }
      );
    }

    const result = await response.json();
    console.log("Cron job result:", result);

    return NextResponse.json({
      success: true,
      message: "Job processing triggered",
      result,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      {
        error: "Cron job failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

