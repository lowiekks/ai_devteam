/**
 * AI-Powered Supplier Vetting
 * Uses GPT-4o to analyze and approve/reject supplier candidates
 */

import OpenAI from "openai";
import { config } from "../config/environment";
import { SupplierCandidate, Product } from "../../../shared/types/database";

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

export interface VettingResult {
  approved: boolean;
  reason: string;
  riskScore: number; // 0-100
}

/**
 * Vet a supplier candidate using AI
 */
export async function vetSupplierWithAI(
  candidate: SupplierCandidate,
  originalProduct: Product
): Promise<VettingResult> {
  try {
    console.log(`AI vetting supplier: ${candidate.url}`);

    const prompt = `
You are a dropshipping risk assessment AI. Analyze this supplier candidate and determine if it's safe to auto-replace the removed product.

ORIGINAL PRODUCT:
- Name: ${originalProduct.name}
- Original Price: $${originalProduct.monitored_supplier.current_price}
- Original Rating: ${originalProduct.monitored_supplier.supplier_rating || "N/A"}

CANDIDATE SUPPLIER:
- URL: ${candidate.url}
- Price: $${candidate.price}
- Supplier Rating: ${candidate.rating}/5.0
- Shipping: ${candidate.shipping_method}
- Image Match Confidence: ${candidate.image_match_confidence}%
- Total Orders: ${candidate.total_orders || "Unknown"}

ASSESSMENT CRITERIA:
1. Is the price reasonable? (Should be within 20% of original)
2. Is the supplier rating high enough? (Should be 4.5+ stars)
3. Does the shipping method provide tracking?
4. Is the image match confidence high enough? (Should be 85%+)
5. Are there any red flags? (Too cheap, no reviews, suspicious patterns)

Respond in JSON format:
{
  "approved": boolean,
  "reason": "Brief explanation (max 100 chars)",
  "riskScore": number (0-100, where 0=no risk, 100=high risk)
}
`;

    const completion = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: "system",
          content: "You are a dropshipping risk assessment expert. Be conservative but fair in your assessments.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temperature for more consistent decisions
    });

    const responseText = completion.choices[0].message.content || "{}";
    const result: VettingResult = JSON.parse(responseText);

    console.log(`AI vetting result: ${result.approved ? "APPROVED" : "REJECTED"} - ${result.reason}`);

    return result;
  } catch (error) {
    console.error("AI vetting error:", error);

    // On error, be conservative and reject
    return {
      approved: false,
      reason: "AI vetting failed",
      riskScore: 100,
    };
  }
}

/**
 * Calculate AI risk score for a product
 * Used for the dashboard risk gauge
 */
export async function calculateProductRiskScore(product: Product): Promise<number> {
  try {
    const prompt = `
Analyze this dropshipping product's risk of supplier removal:

PRODUCT:
- Current Price: $${product.monitored_supplier.current_price}
- Supplier Rating: ${product.monitored_supplier.supplier_rating || "Unknown"}/5.0
- Stock Level: ${product.monitored_supplier.stock_level}
- Last Checked: ${product.monitored_supplier.last_checked}
- Status: ${product.monitored_supplier.status}

HISTORY:
${product.automation_log.slice(-5).map((log) => `- ${log.action}: ${log.details || ""}`).join("\n")}

Calculate a risk score (0-100) where:
- 0-20: Very Low Risk (stable supplier, good history)
- 21-40: Low Risk
- 41-60: Medium Risk
- 61-80: High Risk (price fluctuations, stock issues)
- 81-100: Very High Risk (likely to be removed soon)

Respond in JSON:
{
  "riskScore": number,
  "reasoning": "Brief explanation"
}
`;

    const completion = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: "system",
          content: "You are a predictive risk analysis AI for dropshipping products.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    return result.riskScore || 50;
  } catch (error) {
    console.error("Risk score calculation error:", error);
    return 50; // Default to medium risk on error
  }
}
