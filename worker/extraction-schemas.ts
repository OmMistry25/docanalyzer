import { z } from "zod";

/**
 * Schema for extracted document insights
 */
export const DocumentInsightsSchema = z.object({
  documentType: z.string().describe("Type of document (e.g., Insurance Card, Utility Bill, Privacy Policy, Employment Contract)"),
  summary: z.string().describe("2-3 sentence overview in plain language"),
  keyPoints: z.array(z.string()).describe("3-5 most important takeaways"),
  criticalDates: z.array(
    z.object({
      date: z.string(),
      description: z.string(),
    })
  ),
  financialDetails: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      note: z.string().optional(),
    })
  ),
  importantClauses: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      significance: z.string(),
    })
  ),
  redFlags: z.array(
    z.object({
      issue: z.string(),
      explanation: z.string(),
      severity: z.enum(["low", "medium", "high"]),
    })
  ),
  plainEnglish: z.string().describe("Explain complex terms in simple language"),
});

export type DocumentInsights = z.infer<typeof DocumentInsightsSchema>;

/**
 * Extraction prompt for Claude
 */
export const EXTRACTION_PROMPT = `Analyze this document (insurance card, utility bill, privacy policy, contract, etc.) and extract key insights that someone might miss.

Respond ONLY with a valid JSON object in this exact format. DO NOT include any text outside the JSON structure, including backticks or markdown:

{
  "documentType": "string (e.g., Insurance Card, Utility Bill, Privacy Policy, Employment Contract)",
  "summary": "string (2-3 sentence overview in plain language)",
  "keyPoints": ["array of 3-5 most important takeaways"],
  "criticalDates": [{"date": "string", "description": "string"}],
  "financialDetails": [{"label": "string", "value": "string", "note": "string (optional)"}],
  "importantClauses": [{"title": "string", "description": "string", "significance": "string"}],
  "redFlags": [{"issue": "string", "explanation": "string", "severity": "low|medium|high"}],
  "plainEnglish": "string (explain complex terms in simple language)"
}

If any section has no relevant information, use an empty array [] or empty string "". DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;

