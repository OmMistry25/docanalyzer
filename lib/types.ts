export interface UploadTokenResponse {
  documentId: string;
  sessionId: string;
  uploadUrl: string;
  token: string;
  path: string;
  expiresAt: string;
}

export interface JobStatus {
  id: string;
  status: "queued" | "running" | "done" | "error";
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentStatus {
  id: string;
  filename: string;
  status: "queued" | "processing" | "succeeded" | "failed";
  detectedType?: string | null;
  createdAt: string;
  expiresAt: string;
  job: JobStatus | null;
}

