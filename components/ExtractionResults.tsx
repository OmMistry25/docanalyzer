"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Calendar, DollarSign, FileText, Shield } from "lucide-react";
import DocumentActions from "@/components/DocumentActions";

interface ExtractionResultsProps {
  documentId: string;
}

export default function ExtractionResults({ documentId }: ExtractionResultsProps) {
  const [extraction, setExtraction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchExtraction() {
      try {
        const response = await fetch(`/api/documents/${documentId}/extraction`);
        if (response.ok) {
          const data = await response.json();
          setExtraction(data);
        }
      } catch (error) {
        console.error("Failed to fetch extraction:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchExtraction();
  }, [documentId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Loading insights...</p>
        </CardContent>
      </Card>
    );
  }

  if (!extraction) {
    return null;
  }

  const fields = extraction.fields || {};

  return (
    <div className="space-y-6">
      {/* Download and Delete Actions */}
      <Card>
        <CardContent className="pt-6">
          <DocumentActions
            documentId={documentId}
            extraction={extraction}
            onDeleteSuccess={() => window.location.href = "/"}
          />
        </CardContent>
      </Card>

      {/* Document Type & Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{fields.documentType || "Document Analysis"}</CardTitle>
            <Badge variant="secondary">{extraction.provider}</Badge>
          </div>
          {fields.summary && (
            <CardDescription className="text-base mt-2">
              {fields.summary}
            </CardDescription>
          )}
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Key Points */}
        {fields.keyPoints && fields.keyPoints.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Key Points</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {fields.keyPoints.map((point: string, idx: number) => (
                  <li key={idx} className="flex gap-2 text-sm">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Critical Dates */}
        {fields.criticalDates && fields.criticalDates.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-lg">Critical Dates</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fields.criticalDates.map((item: any, idx: number) => (
                  <div key={idx} className="border-l-4 border-orange-400 pl-3">
                    <p className="font-semibold text-sm">{item.date}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Financial Details */}
        {fields.financialDetails && fields.financialDetails.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg">Financial Details</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fields.financialDetails.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.label}</p>
                      {item.note && (
                        <p className="text-xs text-muted-foreground">{item.note}</p>
                      )}
                    </div>
                    <p className="font-bold text-green-600">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Important Clauses */}
        {fields.importantClauses && fields.importantClauses.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-lg">Important Clauses</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fields.importantClauses.map((clause: any, idx: number) => (
                  <div key={idx} className="border-l-4 border-indigo-400 pl-3">
                    <p className="font-semibold text-sm">{clause.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {clause.description}
                    </p>
                    <p className="text-xs text-indigo-600 mt-1 italic">
                      {clause.significance}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Red Flags */}
      {fields.redFlags && fields.redFlags.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-lg">Red Flags & Warnings</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {fields.redFlags.map((flag: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg ${
                    flag.severity === "high"
                      ? "bg-red-50 border-l-4 border-red-500"
                      : flag.severity === "medium"
                      ? "bg-yellow-50 border-l-4 border-yellow-500"
                      : "bg-orange-50 border-l-4 border-orange-500"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Badge
                      variant={flag.severity === "high" ? "destructive" : "secondary"}
                      className="mt-0.5"
                    >
                      {flag.severity.toUpperCase()}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{flag.issue}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {flag.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plain English Explanation */}
      {fields.plainEnglish && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Plain English Explanation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {fields.plainEnglish}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

