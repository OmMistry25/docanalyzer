import { z } from "zod";

/**
 * Schema for extracted document insights
 */
export const DocumentInsightsSchema = z.object({
  documentType: z.string().describe("Type of document (e.g., Insurance Card, Utility Bill, Privacy Policy, Employment Contract)"),
  summary: z.string().describe("Comprehensive 2-3 sentence summary with specific details: names, dates, policy/account numbers, what the document is, and its key purpose. Be specific, not generic."),
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
  plainEnglish: z.string().describe("A comprehensive explanation (3-4 sentences) that explains what this document means for the person, how it works, what they should know, and any important implications. Use simple language but be thorough and specific."),
});

export type DocumentInsights = z.infer<typeof DocumentInsightsSchema>;

/**
 * Step 1: Document type detection prompt
 */
export const DOCUMENT_TYPE_DETECTION_PROMPT = `Analyze this document and identify its type. Be specific and accurate.

Respond with a JSON object containing only the document type:
{
  "documentType": "Insurance Card" | "Utility Bill" | "Privacy Policy" | "Employment Contract" | "Lease Agreement" | "Tax Document" | "Invoice" | "Receipt" | "Medical Bill" | "Bank Statement" | "Other"
}

Choose the MOST SPECIFIC type that matches. If uncertain, use "Other".`;

/**
 * Document type-specific extraction templates
 */
export const DOCUMENT_TYPE_TEMPLATES = {
  "Insurance Card": {
    summaryTemplate: "This is a [ORGANIZATION NAME] [PLAN NAME] insurance card for [SUBSCRIBER NAME], effective [DATE]. It shows copay amounts for different types of medical services. This is an HMO-style plan requiring referrals with PCP [DOCTOR NAME].",
    keyPointsFormat: [
      "Subscriber/Account holder name and ID: [NAME], [ID]",
      "Policy/Group/Account numbers: [NUMBERS]",
      "Coverage/Effective dates: [DATE]",
      "Key service costs or terms: [LIST ALL COSTS]",
      "Special requirements or restrictions: [REQUIREMENTS]"
    ],
    plainEnglishTemplate: "This is a managed care health plan where you pay set copay amounts for different medical services. You must choose a primary care doctor who coordinates your care and provides referrals to specialists. Emergency room visits cost $[AMOUNT], encouraging you to use urgent care ($[AMOUNT]) or your primary doctor ($[AMOUNT]) instead. Virtual visits are free to promote telehealth usage."
  },
  "Utility Bill": {
    summaryTemplate: "This is a [UTILITY TYPE] bill from [COMPANY NAME] for [CUSTOMER NAME], covering the billing period [START DATE] to [END DATE]. The total amount due is $[AMOUNT], due by [DUE DATE]. Usage for this period was [USAGE] [UNITS].",
    keyPointsFormat: [
      "Account holder: [NAME], Account #: [NUMBER]",
      "Billing period: [START] to [END]",
      "Total amount due: $[AMOUNT] by [DUE DATE]",
      "Current usage: [USAGE] [UNITS]",
      "Payment methods: [OPTIONS]"
    ],
    plainEnglishTemplate: "This is your [UTILITY TYPE] bill showing how much [UTILITY] you used and what you owe. You used [USAGE] [UNITS] this month, which costs $[AMOUNT]. Payment is due by [DUE DATE] to avoid late fees. You can pay online, by phone, or by mail using the account number provided."
  },
  "Default": {
    summaryTemplate: "This is a [DOCUMENT TYPE] from [ISSUER/ORGANIZATION], related to [PRIMARY SUBJECT]. Key details include [IMPORTANT INFO 1], [IMPORTANT INFO 2], and [IMPORTANT INFO 3]. The document is dated [DATE] and pertains to [PURPOSE].",
    keyPointsFormat: [
      "Primary subject/account holder: [INFO]",
      "Key identifiers (IDs, numbers): [INFO]",
      "Important dates: [INFO]",
      "Financial/cost details: [INFO]",
      "Requirements or conditions: [INFO]"
    ],
    plainEnglishTemplate: "This document [WHAT IT IS] and [WHAT IT MEANS FOR YOU]. [KEY REQUIREMENT OR FEATURE]. [IMPORTANT FINANCIAL OR TEMPORAL DETAIL]. [WHAT ACTION YOU NEED TO TAKE OR BE AWARE OF]."
  }
};

/**
 * Generate extraction prompt based on document type
 */
export function getExtractionPrompt(documentType: string): string {
  const template = DOCUMENT_TYPE_TEMPLATES[documentType as keyof typeof DOCUMENT_TYPE_TEMPLATES] 
    || DOCUMENT_TYPE_TEMPLATES["Default"];
  
  return `You are a document analyzer that produces CONSISTENT, STRUCTURED output for a ${documentType}. Extract information following these EXACT rules:

**CRITICAL: Output must be DETERMINISTIC. For identical documents, produce identical JSON.**

Respond ONLY with valid JSON. NO markdown, NO backticks, NO extra text.

STRUCTURE RULES (FOLLOW EXACTLY):

1. **documentType**: "${documentType}"

2. **summary**: ALWAYS use this EXACT template:
   "${template.summaryTemplate}"
   
   - Use EXACT wording from the template
   - Only fill in the bracketed fields with actual values from the document
   - Do NOT add extra words or rephrase

3. **keyPoints**: ALWAYS extract in this EXACT order and format (skip if not found):
${template.keyPointsFormat.map(format => `   - "${format}"`).join('\n')}
   
   - Use EXACT prefixes from the template
   - Do NOT rephrase or use synonyms
   - Be concise and factual

4. **criticalDates**: Extract ALL dates in format:
   - date: "MM/DD/YY" (use document's format)
   - description: "[What the date represents]" (brief, clear)

5. **financialDetails**: List ALL monetary amounts:
   - label: "[Service/Item name]"
   - value: "$XX" or "$XX/$YY"
   - note: "[Additional context]" (optional)

6. **importantClauses**: Extract policies/rules/restrictions:
   - title: "[Brief title]"
   - description: "[What it says]"
   - significance: "[Why it matters]"

7. **redFlags**: Only include actual warnings/concerns:
   - issue: "[Problem]"
   - explanation: "[Why concerning]"
   - severity: "high|medium|low"

8. **plainEnglish**: ALWAYS use this EXACT template:
   "${template.plainEnglishTemplate}"
   
   - Use EXACT wording from the template
   - Only replace the bracketed placeholders with actual values from the document
   - Do NOT rephrase or add extra sentences

JSON SCHEMA:
{
  "documentType": "${documentType}",
  "summary": "string (follow template above)",
  "keyPoints": ["string array"],
  "criticalDates": [{"date": "string", "description": "string"}],
  "financialDetails": [{"label": "string", "value": "string", "note": "string"}],
  "importantClauses": [{"title": "string", "description": "string", "significance": "string"}],
  "redFlags": [{"issue": "string", "explanation": "string", "severity": "low|medium|high"}],
  "plainEnglish": "string (follow template above)"
}

**Extract ALL visible information. Be factual, not interpretive. Use exact numbers/names from document.**`;
}


