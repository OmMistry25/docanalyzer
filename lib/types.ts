export interface UploadTokenResponse {
  documentId: string;
  sessionId: string;
  uploadUrl: string;
  token: string;
  path: string;
  expiresAt: string;
}

export interface DocumentStatus {
  id: string;
  status: "queued" | "processing" | "succeeded" | "failed";
  detected_type?: string;
  created_at: string;
  expires_at: string;
}

