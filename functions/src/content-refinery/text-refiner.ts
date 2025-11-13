/**
 * AI Text Refinement Module
 * Transforms raw AliExpress product copy into premium, conversion-optimized content
 * Uses GPT-4o to rewrite titles, descriptions, and generate marketing copy
 */

import * as functions from "firebase-functions";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import OpenAI from "openai";
import { config } from "../config/environment";
import { Product } from "../../../shared/types/database";

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

interface RefinedContent {
  title: string;
  hook: string;
  features: string[];
  instagram_caption: string;
  facebook_post: string;
}

/**
 * Firestore Trigger: Refine text when new product is created with RAW_IMPORT status
 */
export const refineProductText = functions
  .runWith({
    timeoutSeconds: 120,
    memory: "512MB",
  })
  .firestore.document("products/{productId}")
  .onCreate(async (snap, context) => {
    const db = getFirestore();
    const productId = context.params.productId;
    const data = snap.data() as Product;

    console.log(`Text refinery triggered for product: ${productId}`);

    // Only process RAW_IMPORT products that haven't been text-refined
    if (data.content_status !== "RAW_IMPORT" || data.content_flags.text_refined) {
      console.log(`Skipping text refinement - status: ${data.content_status}, text_refined: ${data.content_flags.text_refined}`);
      return;
    }

    // Check user settings
    const userDoc = await db.collection("users").doc(data.user_id).get();
    const userData = userDoc.data();

    if (!userData?.settings?.auto_refine_text) {
      console.log(`Auto-refine text disabled for user ${data.user_id}`);
      return;
    }

    try {
      // Extract raw content
      const rawTitle = data.public_data.original_title || data.name;
      const rawDescription = data.public_data.original_description || "";
      const price = data.monitored_supplier.current_price;

      console.log(`Refining text for: "${rawTitle}"`);

      // Call GPT-4o to refine the content
      const refinedContent = await generateRefinedContent(rawTitle, rawDescription, price);

      // Update product with refined content
      await snap.ref.update({
        "public_data.title": refinedContent.title,
        "public_data.short_description": refinedContent.hook,
        "public_data.features": refinedContent.features,
        "social_media.instagram_caption": refinedContent.instagram_caption,
        "social_media.facebook_post": refinedContent.facebook_post,
        "social_media.generated_at": FieldValue.serverTimestamp(),
        "social_media.posted": false,
        "content_flags.text_refined": true,
        content_status: "PROCESSING",
        updated_at: FieldValue.serverTimestamp(),
      });

      console.log(`Text refinement completed for product: ${productId}`);

      // Log analytics
      await db.collection("analytics").add({
        event_type: "text_refined",
        product_id: productId,
        user_id: data.user_id,
        timestamp: FieldValue.serverTimestamp(),
        metadata: {
          original_title: rawTitle,
          refined_title: refinedContent.title,
        },
      });
    } catch (error) {
      console.error("Text refinement error:", error);

      // Mark as failed
      await snap.ref.update({
        "content_flags.text_refined": false,
        content_status: "RAW_IMPORT",
        automation_log: FieldValue.arrayUnion({
          action: "TEXT_REFINEMENT_FAILED",
          timestamp: new Date(),
          details: (error as Error).message,
        }),
      });

      throw error;
    }
  });

/**
 * Generate refined content using GPT-4o
 */
async function generateRefinedContent(
  rawTitle: string,
  rawDescription: string,
  price: number
): Promise<RefinedContent> {
  const prompt = `You are an expert e-commerce copywriter specializing in creating high-converting product listings.

TASK: Transform this raw AliExpress product listing into premium, professional copy.

RAW PRODUCT INFO:
Title: ${rawTitle}
Description: ${rawDescription}
Price: $${price}

INSTRUCTIONS:
1. **Title**: Rewrite to be compelling and professional
   - Remove spam words: "New", "Hot", "2024", "2025", "Sale"
   - Keep it under 60 characters
   - Focus on the key benefit or unique feature
   - Make it sound premium (not cheap)

2. **Hook** (short_description): Write a 2-sentence compelling description
   - First sentence: Create desire (emotional appeal)
   - Second sentence: Provide social proof or key benefit
   - Total: 150-200 characters

3. **Features**: Extract the 3-5 most important product features
   - Format as benefit-focused bullet points
   - Start each with an action verb
   - Keep each under 80 characters
   - Focus on "what's in it for the customer"

4. **Instagram Caption**: Write an engaging Instagram caption
   - 1-2 sentences max
   - Include 3-5 relevant hashtags
   - Use emojis strategically (1-2 max)
   - Create FOMO or excitement

5. **Facebook Post**: Write a Facebook post
   - 2-3 sentences
   - More detailed than Instagram
   - Include a call-to-action
   - Professional tone

OUTPUT FORMAT (JSON only, no markdown):
{
  "title": "...",
  "hook": "...",
  "features": ["...", "...", "..."],
  "instagram_caption": "...",
  "facebook_post": "..."
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: "system",
          content: "You are a professional e-commerce copywriter. You write compelling, conversion-optimized product copy. Always output valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7, // Slightly creative but consistent
      max_tokens: 800,
    });

    const responseText = completion.choices[0].message.content || "{}";
    const refinedContent: RefinedContent = JSON.parse(responseText);

    // Validate the response
    if (!refinedContent.title || !refinedContent.hook || !refinedContent.features) {
      throw new Error("Incomplete refined content from GPT-4o");
    }

    return refinedContent;
  } catch (error) {
    console.error("GPT-4o refinement error:", error);
    throw new Error(`Failed to generate refined content: ${(error as Error).message}`);
  }
}

/**
 * Callable function to manually trigger text refinement
 */
export const triggerTextRefinement = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  const { productId } = data;

  if (!productId) {
    throw new functions.https.HttpsError("invalid-argument", "productId is required");
  }

  const db = getFirestore();
  const productDoc = await db.collection("products").doc(productId).get();

  if (!productDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Product not found");
  }

  const product = productDoc.data() as Product;

  // Verify ownership
  if (product.user_id !== context.auth.uid) {
    throw new functions.https.HttpsError("permission-denied", "Not authorized");
  }

  try {
    const rawTitle = product.public_data.original_title || product.name;
    const rawDescription = product.public_data.original_description || "";
    const price = product.monitored_supplier.current_price;

    const refinedContent = await generateRefinedContent(rawTitle, rawDescription, price);

    await productDoc.ref.update({
      "public_data.title": refinedContent.title,
      "public_data.short_description": refinedContent.hook,
      "public_data.features": refinedContent.features,
      "social_media.instagram_caption": refinedContent.instagram_caption,
      "social_media.facebook_post": refinedContent.facebook_post,
      "social_media.generated_at": FieldValue.serverTimestamp(),
      "content_flags.text_refined": true,
      updated_at: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      refinedContent,
    };
  } catch (error) {
    console.error("Manual text refinement error:", error);
    throw new functions.https.HttpsError("internal", "Failed to refine text");
  }
});
