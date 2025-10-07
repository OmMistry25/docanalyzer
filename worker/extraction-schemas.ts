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
 * Extraction prompt for Claude
 */
export const EXTRACTION_PROMPT = `You are a document analyzer that produces CONSISTENT, STRUCTURED output. Extract information following these EXACT rules:

**CRITICAL: Output must be DETERMINISTIC. For identical documents, produce identical JSON.**

Respond ONLY with valid JSON. NO markdown, NO backticks, NO extra text.

STRUCTURE RULES (FOLLOW EXACTLY):

1. **summary**: ALWAYS use this EXACT word-for-word template (no variations allowed):
   "This is a [ORGANIZATION NAME] [PLAN NAME] insurance card for [SUBSCRIBER NAME], effective [DATE]. It shows copay amounts for different types of medical services. This is an HMO-style plan requiring referrals with PCP [DOCTOR NAME]."
   
   - Use EXACT wording: "This is a", "insurance card for", "effective", "It shows copay amounts for different types of medical services", "This is an HMO-style plan requiring referrals with PCP"
   - Only fill in the bracketed fields with actual values from the document
   - Do NOT add extra words or rephrase

2. **keyPoints**: ALWAYS extract in this EXACT order and format (skip if not found):
   - "Subscriber/Account holder name and ID: [NAME], [ID]"
   - "Policy/Group/Account numbers: [NUMBERS]"
   - "Coverage/Effective dates: [DATE]"
   - "Key service costs or terms: [LIST ALL COSTS]"
   - "Special requirements or restrictions: [REQUIREMENTS]"
   
   - Use EXACT prefixes: "Subscriber/Account holder name and ID:", "Policy/Group/Account numbers:", etc.
   - Do NOT rephrase or use synonyms
   - Be concise and factual

3. **criticalDates**: Extract ALL dates in format:
   - date: "MM/DD/YY" (use document's format)
   - description: "[What the date represents]" (brief, clear)

4. **financialDetails**: List ALL monetary amounts:
   - label: "[Service/Item name]"
   - value: "$XX" or "$XX/$YY"
   - note: "[Additional context]" (optional)

5. **importantClauses**: Extract policies/rules/restrictions:
   - title: "[Brief title]"
   - description: "[What it says]"
   - significance: "[Why it matters]"

6. **redFlags**: Only include actual warnings/concerns:
   - issue: "[Problem]"
   - explanation: "[Why concerning]"
   - severity: "high|medium|low"

7. **plainEnglish**: ALWAYS use this EXACT 4-sentence template (no variations):
   "This is a managed care health plan where you pay set copay amounts for different medical services. You must choose a primary care doctor who coordinates your care and provides referrals to specialists. Emergency room visits cost $[AMOUNT], encouraging you to use urgent care ($[AMOUNT]) or your primary doctor ($[AMOUNT]) instead. Virtual visits are free to promote telehealth usage."
   
   - Use EXACT wording: "This is a managed care health plan where", "You must choose a primary care doctor who", "Emergency room visits cost", "Virtual visits are free to promote telehealth usage"
   - Only replace the $[AMOUNT] placeholders with actual costs from the document
   - Do NOT rephrase or add extra sentences

JSON SCHEMA:
{
  "documentType": "string",
  "summary": "string (follow template above)",
  "keyPoints": ["string array"],
  "criticalDates": [{"date": "string", "description": "string"}],
  "financialDetails": [{"label": "string", "value": "string", "note": "string"}],
  "importantClauses": [{"title": "string", "description": "string", "significance": "string"}],
  "redFlags": [{"issue": "string", "explanation": "string", "severity": "low|medium|high"}],
  "plainEnglish": "string (follow template above)"
}

**Extract ALL visible information. Be factual, not interpretive. Use exact numbers/names from document.**`;

