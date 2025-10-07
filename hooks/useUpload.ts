"use client";

import { useState } from "react";
import { requestUploadToken, uploadFileToStorage, storeSessionId } from "@/lib/api";

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  documentId: string | null;
  sessionId: string | null;
}

export function useUpload() {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    documentId: null,
    sessionId: null,
  });

  const uploadFile = async (file: File) => {
    setState({
      isUploading: true,
      progress: 0,
      error: null,
      documentId: null,
      sessionId: null,
    });

    try {
      // Step 1: Request upload token
      const tokenData = await requestUploadToken(file.name, file.type, file.size);

      // Step 2: Upload file to storage using signed URL
      await uploadFileToStorage(
        file,
        tokenData.uploadUrl,
        tokenData.token,
        (progress) => {
          setState((prev) => ({ ...prev, progress }));
        }
      );

      // Step 3: Store session ID for later access
      storeSessionId(tokenData.sessionId);

      // Success!
      setState({
        isUploading: false,
        progress: 100,
        error: null,
        documentId: tokenData.documentId,
        sessionId: tokenData.sessionId,
      });

      return {
        documentId: tokenData.documentId,
        sessionId: tokenData.sessionId,
      };
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isUploading: false,
        error: error.message || "Upload failed",
      }));
      throw error;
    }
  };

  const reset = () => {
    setState({
      isUploading: false,
      progress: 0,
      error: null,
      documentId: null,
      sessionId: null,
    });
  };

  return {
    ...state,
    uploadFile,
    reset,
  };
}

