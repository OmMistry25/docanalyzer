import { config } from "dotenv";

config({ path: ".env.local" });

async function testUploadToken() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  console.log("🧪 Testing /api/upload/token endpoint...\n");

  const testFile = {
    filename: "test-document.pdf",
    mime: "application/pdf",
    size: 1024 * 500, // 500KB
  };

  try {
    const response = await fetch(`${appUrl}/api/upload/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testFile),
    });

    console.log("Status:", response.status);

    const data = await response.json();

    if (response.ok) {
      console.log("\n✅ Upload token generated successfully!\n");
      console.log("Document ID:", data.documentId);
      console.log("Session ID:", data.sessionId);
      console.log("Upload URL:", data.uploadUrl.substring(0, 80) + "...");
      console.log("Expires At:", data.expiresAt);
      console.log("\nYou can now use this signed URL to upload a file.");
    } else {
      console.log("\n❌ Failed to generate upload token");
      console.log("Error:", data);
    }
  } catch (error: any) {
    console.error("❌ Request failed:", error.message);
  }
}

testUploadToken();

