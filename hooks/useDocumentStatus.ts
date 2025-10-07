"use client";

import { useEffect, useState } from "react";
import { DocumentStatus } from "@/lib/types";

interface UseDocumentStatusOptions {
  documentId: string | null;
  enabled?: boolean;
  pollInterval?: number;
}

export function useDocumentStatus({
  documentId,
  enabled = true,
  pollInterval = 2000, // Poll every 2 seconds
}: UseDocumentStatusOptions) {
  const [status, setStatus] = useState<DocumentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!documentId || !enabled) {
      return;
    }

    let intervalId: NodeJS.Timeout;

    const fetchStatus = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/documents/${documentId}/status`);

        if (!response.ok) {
          throw new Error("Failed to fetch status");
        }

        const data = await response.json();
        setStatus(data);
        setError(null);

        // Stop polling if job is done or errored
        if (data.job?.status === "done" || data.job?.status === "error") {
          if (intervalId) {
            clearInterval(intervalId);
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch immediately
    fetchStatus();

    // Then poll at interval
    intervalId = setInterval(fetchStatus, pollInterval);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [documentId, enabled, pollInterval]);

  return {
    status,
    error,
    isLoading,
  };
}

