"use client";

import { useDocumentStatus } from "@/hooks/useDocumentStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

interface DocumentStatusProps {
  documentId: string;
}

export default function DocumentStatus({ documentId }: DocumentStatusProps) {
  const { status, error, isLoading } = useDocumentStatus({
    documentId,
    enabled: !!documentId,
  });

  if (!documentId) return null;

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            <span>Failed to load status: {error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getJobStatusBadge = () => {
    if (!status.job) {
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          No Job
        </Badge>
      );
    }

    switch (status.job.status) {
      case "queued":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Queued
          </Badge>
        );
      case "running":
        return (
          <Badge>
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      case "done":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Complete
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Document Status</span>
          {getJobStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Filename</p>
          <p className="font-medium">{status.filename}</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Document Status</p>
          <p className="font-medium capitalize">{status.status}</p>
        </div>

        {status.detectedType && (
          <div>
            <p className="text-sm text-muted-foreground">Detected Type</p>
            <p className="font-medium">{status.detectedType}</p>
          </div>
        )}

        {status.job?.error && (
          <div>
            <p className="text-sm text-destructive">Error</p>
            <p className="text-sm">{status.job.error}</p>
          </div>
        )}

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Created: {new Date(status.createdAt).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            Expires: {new Date(status.expiresAt).toLocaleString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

