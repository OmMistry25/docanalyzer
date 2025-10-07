"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Loader2 } from "lucide-react";
import { getStoredSessionId } from "@/lib/api";

interface DocumentActionsProps {
  documentId: string;
  extraction: any;
  onDeleteSuccess?: () => void;
}

export default function DocumentActions({
  documentId,
  extraction,
  onDeleteSuccess,
}: DocumentActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDownload = () => {
    const data = {
      documentId,
      extraction,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `document-${documentId}-insights.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsDeleting(true);

    try {
      const sessionId = getStoredSessionId();
      if (!sessionId) {
        alert("Session not found. Cannot delete document.");
        return;
      }

      const response = await fetch(`/api/documents/${documentId}/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Delete failed: ${error.error || "Unknown error"}`);
        return;
      }

      alert("Document deleted successfully!");
      if (onDeleteSuccess) {
        onDeleteSuccess();
      } else {
        // Reload the page to reset state
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete document");
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="flex gap-3 items-center">
      <Button onClick={handleDownload} variant="outline" className="gap-2">
        <Download className="h-4 w-4" />
        Download JSON
      </Button>

      {showConfirm ? (
        <div className="flex gap-2 items-center">
          <span className="text-sm text-muted-foreground">Are you sure?</span>
          <Button
            onClick={handleDelete}
            variant="destructive"
            disabled={isDeleting}
            className="gap-2"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {isDeleting ? "Deleting..." : "Yes, Delete"}
          </Button>
          <Button
            onClick={() => setShowConfirm(false)}
            variant="ghost"
            disabled={isDeleting}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          onClick={handleDelete}
          variant="outline"
          className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      )}
    </div>
  );
}

