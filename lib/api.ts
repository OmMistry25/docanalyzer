import { UploadTokenResponse } from "./types";

/**
 * Request an upload token from the server
 */
export async function requestUploadToken(
  filename: string,
  mime: string,
  size: number
): Promise<UploadTokenResponse> {
  const response = await fetch("/api/upload/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filename, mime, size }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to request upload token");
  }

  return response.json();
}

/**
 * Upload file to storage using signed URL
 */
export async function uploadFileToStorage(
  file: File,
  uploadUrl: string,
  token: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = (e.loaded / e.total) * 100;
        onProgress(progress);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Upload failed"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload aborted"));
    });

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("x-upsert", "false");
    
    xhr.send(file);
  });
}

/**
 * Store session ID in localStorage for later access
 */
export function storeSessionId(sessionId: string): void {
  localStorage.setItem("docanalyzer_session_id", sessionId);
}

/**
 * Get stored session ID
 */
export function getStoredSessionId(): string | null {
  return localStorage.getItem("docanalyzer_session_id");
}

/**
 * Enqueue a parse job for a document
 */
export async function enqueueParseJob(documentId: string): Promise<void> {
  const response = await fetch(`/api/documents/${documentId}/job`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to enqueue parse job");
  }

  return response.json();
}

