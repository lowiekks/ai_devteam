/**
 * AI Content Enhancement Pipeline - Step 2
 * Uses Gemini AI to enhance product text content
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Enhanced text content from Gemini
 */
export interface EnhancedText {
  title: string;
  shortDescription: string;
  longDescription: string;
  features: string[];
  tags: string[];
  category: string;
}

/**
 * Initialize Gemini AI
 */
function initializeGemini(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  return new GoogleGenerativeAI(apiKey);
}

/**
 * Enhance product text using Gemini AI
 * Removes brand names, makes SEO-friendly, creates compelling copy
 */
export async function enhanceProductText(
  originalTitle: string,
  originalDescription: string,
  price: { min: number; max: number; currency: string }
): Promise<EnhancedText> {
  const startTime = Date.now();

  try {
    const genAI = initializeGemini();
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `You are an expert e-commerce copywriter and SEO specialist. Transform this raw AliExpress product listing into compelling, professional e-commerce content.

ORIGINAL TITLE:
${originalTitle}

ORIGINAL DESCRIPTION:
${originalDescription}

PRICE RANGE: $${price.min} - $${price.max} ${price.currency}

YOUR TASK:
1. Create an SEO-optimized product title (max 70 characters)
   - Remove all supplier/manufacturer brand names
   - Focus on what the product IS and what it DOES
   - Include key benefits or features
   - Make it searchable and compelling

2. Write a short description (2-3 sentences, ~50 words)
   - This is the "hook" - make it compelling and benefit-focused
   - Answer: "Why should I buy this?"
   - Use emotional triggers and value propositions

3. Write a long HTML-formatted description (200-300 words)
   - Use <h3> for section headers
   - Use <p> for paragraphs
   - Use <ul> and <li> for lists
   - Include: product benefits, use cases, specifications, and quality assurance
   - Write in a professional but friendly tone
   - Focus on customer benefits, not just features

4. Generate 5-7 key feature bullet points
   - Each should be benefit-focused, not just a specification
   - Start with a strong verb or benefit statement
   - Keep each under 10 words

5. Generate 8-12 SEO tags (comma-separated)
   - Include: product type, use cases, target audience, key features
   - Use lowercase, no special characters

6. Suggest a product category
   - Choose one: Electronics, Home & Garden, Fashion, Sports & Outdoors, Beauty & Health, Toys & Games, Automotive, Pet Supplies, Office Supplies, Other

IMPORTANT RULES:
- NEVER include supplier names, store names, or brand names from AliExpress
- Make it sound like YOUR store's product, not a dropshipped item
- Use "this product" or "our product" instead of brand references
- Focus on benefits over features
- Keep language professional but conversational
- Ensure all HTML is valid and properly closed

OUTPUT FORMAT (JSON):
{
  "title": "SEO-optimized title here",
  "shortDescription": "2-3 sentence hook here",
  "longDescription": "<h3>Section Header</h3><p>Paragraph...</p><ul><li>Item</li></ul>",
  "features": ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"],
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8"],
  "category": "Category Name"
}

Return ONLY the JSON object, no additional text.`;

    console.log(`[Gemini] Enhancing product text...`);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse Gemini response as JSON");
    }

    const enhancedData = JSON.parse(jsonMatch[0]);

    const processingTime = Date.now() - startTime;
    console.log(`[Gemini] Text enhancement completed in ${processingTime}ms`);

    return {
      title: enhancedData.title || originalTitle,
      shortDescription: enhancedData.shortDescription || "",
      longDescription: enhancedData.longDescription || "",
      features: enhancedData.features || [],
      tags: enhancedData.tags || [],
      category: enhancedData.category || "Other",
    };
  } catch (error: any) {
    console.error("[Gemini] Error enhancing text:", error);
    throw new Error(`Gemini AI enhancement failed: ${error.message}`);
  }
}

/**
 * Calculate suggested pricing with profit margin
 */
export function calculatePricing(costPrice: number, profitMarginPercent: number = 50) {
  const suggestedPrice = costPrice * (1 + profitMarginPercent / 100);
  const compareAtPrice = suggestedPrice * 1.3; // 30% higher for "sale" effect

  return {
    suggested_price: Math.ceil(suggestedPrice * 100) / 100, // Round to 2 decimals
    cost_price: costPrice,
    profit_margin: profitMarginPercent,
    compare_at_price: Math.ceil(compareAtPrice * 100) / 100,
  };
}
