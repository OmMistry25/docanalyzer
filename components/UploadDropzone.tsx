"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, X, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useUpload } from "@/hooks/useUpload";

const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB
const ACCEPTED_FORMATS = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/tiff": [".tif", ".tiff"],
};

interface UploadDropzoneProps {
  onUploadComplete?: (documentId: string, sessionId: string) => void;
}

export default function UploadDropzone({ onUploadComplete }: UploadDropzoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { isUploading, progress, error, documentId, uploadFile, reset } = useUpload();

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: any[]) => {
      // Handle rejected files
      if (rejectedFiles.length > 0) {
        return; // Errors handled by react-dropzone
      }

      // Handle accepted file
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setSelectedFile(file);
        
        // Automatically start upload
        try {
          const result = await uploadFile(file);
          onUploadComplete?.(result.documentId, result.sessionId);
        } catch (error) {
          // Error is already set in the upload hook
          console.error("Upload failed:", error);
        }
      }
    },
    [uploadFile, onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    disabled: isUploading || !!documentId,
  });

  const removeFile = () => {
    setSelectedFile(null);
    reset();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <div className="w-full space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!selectedFile || (!isUploading && !documentId) ? (
        <Card>
          <CardContent className="pt-6">
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
                ${
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                }
              `}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              
              {isDragActive ? (
                <p className="text-lg font-medium">Drop the file here...</p>
              ) : (
                <>
                  <p className="text-lg font-medium mb-2">
                    Drag and drop your document here
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    or click to browse files
                  </p>
                  <Button type="button" variant="secondary">
                    Select File
                  </Button>
                </>
              )}

              <div className="mt-6 text-xs text-muted-foreground">
                <p>Supported formats: PDF, JPG, PNG, TIFF</p>
                <p className="mt-1">Maximum file size: 30MB</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {documentId ? (
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                  ) : isUploading ? (
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  ) : (
                    <FileText className="h-10 w-10 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                  {isUploading && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Uploading... {Math.round(progress)}%
                    </p>
                  )}
                  {documentId && (
                    <p className="text-xs text-green-600 mt-1">
                      Upload complete!
                    </p>
                  )}
                </div>
                {!isUploading && !documentId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={removeFile}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {isUploading && (
                <Progress value={progress} className="w-full" />
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

