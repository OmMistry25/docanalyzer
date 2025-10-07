"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UploadDropzone from "@/components/UploadDropzone";
import DocumentStatus from "@/components/DocumentStatus";
import ExtractionResults from "@/components/ExtractionResults";
import { useDocumentStatus } from "@/hooks/useDocumentStatus";

export default function Home() {
  const router = useRouter();
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  
  const { status } = useDocumentStatus({
    documentId: currentDocumentId,
    enabled: !!currentDocumentId,
  });

  const handleUploadComplete = (documentId: string, sessionId: string) => {
    console.log("Upload complete:", { documentId, sessionId });
    setCurrentDocumentId(documentId);
  };

  // Check if extraction is complete
  const isComplete = status?.job?.status === "done";

  return (
    <main className="min-h-screen p-8 md:p-24">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">DocAnalyzer</h1>
          <p className="text-lg text-muted-foreground">
            Anonymous document analysis with AI-powered insights
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            No signup required • Automatic deletion after 7 days
          </p>
        </div>

        <UploadDropzone onUploadComplete={handleUploadComplete} />

        {currentDocumentId && (
          <div className="mt-8 space-y-6">
            <DocumentStatus documentId={currentDocumentId} />
            
            {isComplete && (
              <ExtractionResults documentId={currentDocumentId} />
            )}
          </div>
        )}

        <div className="mt-12 grid gap-4 md:grid-cols-3 text-center">
          <div>
            <h3 className="font-semibold mb-2">Zero Friction</h3>
            <p className="text-sm text-muted-foreground">
              Upload and analyze instantly without creating an account
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Private & Secure</h3>
            <p className="text-sm text-muted-foreground">
              Files auto-delete after 7 days. Full control over your data
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">AI-Powered</h3>
            <p className="text-sm text-muted-foreground">
              Extract insights from insurance cards, bills, and contracts
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

