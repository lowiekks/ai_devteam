/**
 * SEO Blog Generator - Programmatic Content Marketing
 * Automatically generates SEO-optimized blog posts for products
 * Drives organic traffic from Google without manual content creation
 */

import * as functions from "firebase-functions";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import OpenAI from "openai";
import { config } from "../config/environment";
import { Product } from "../../../shared/types/database";
import { BlogPost, BlogPostType } from "../../../shared/types/blog";

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * Generate a blog post for a product
 */
async function generateBlogPost(
  product: Product,
  postType: BlogPostType
): Promise<Partial<BlogPost>> {
  const prompts: Record<BlogPostType, string> = {
    product_review: `Write a comprehensive 1000-word product review blog post.

Product: ${product.public_data.title}
Price: $${product.monitored_supplier.current_price}
Features: ${product.public_data.features.join(", ")}

Structure:
1. **Introduction** (150 words)
   - Hook the reader with the problem this product solves
   - Brief overview of what the product is

2. **Key Features & Benefits** (300 words)
   - Detailed breakdown of ${product.public_data.features.length} main features
   - Real-world benefits for each feature

3. **Who Is This For?** (200 words)
   - Ideal customer profile
   - Use cases and scenarios

4. **Pros & Cons** (200 words)
   - 4-5 pros
   - 2-3 honest cons (builds trust)

5. **Value for Money** (100 words)
   - Is the $${product.monitored_supplier.current_price} price justified?
   - Comparison to similar products

6. **Conclusion** (150 words)
   - Summary of key points
   - Strong call-to-action

SEO Requirements:
- Use keyword "${product.public_data.title}" 5-7 times naturally
- Include related keywords (extract from product features)
- Use H2 and H3 headings
- Write in conversational, engaging tone
- Include actionable advice

Format: Markdown with proper headings`,

    comparison: `Write a detailed comparison article (1200 words).

Product: ${product.public_data.title}
Price: $${product.monitored_supplier.current_price}

Title: "${product.public_data.title} vs Generic Alternatives: Which Is Worth Your Money?"

Structure:
1. **Introduction** - Why this comparison matters
2. **Quick Comparison Table** - Side-by-side specs
3. **Detailed Feature Comparison** - Deep dive into differences
4. **Price Analysis** - Value proposition
5. **User Reviews Summary** - What customers say
6. **Winner** - Clear recommendation with reasoning

Make it objective but subtly favor our product. Use data and facts.`,

    best_of_list: `Write a "Best Of" listicle (1500 words).

Create: "10 Best ${product.public_data.title.split(" ")[0]} Products for 2025"

Include:
1. Our product as #1 or #2 (most prominent position)
2. 9-10 other products (can be generic/competitors)
3. For each product:
   - Brief description
   - Key features (3-4 bullet points)
   - Price range
   - Who it's best for
   - Pros/cons

Use engaging, listicle format with clear headers.`,

    how_to_guide: `Write a helpful how-to guide (1000 words).

Title: "How to Choose the Perfect ${product.public_data.title.split(" ").slice(-2).join(" ")}: Complete Buyer's Guide"

Include:
1. What to look for (5-7 criteria)
2. Common mistakes to avoid
3. How to use it effectively
4. Maintenance tips
5. Recommendation: Feature our product as top choice

Educational and helpful tone.`,

    trend_article: `Write a viral trend article (800 words).

Title: "Why Everyone is Buying ${product.public_data.title} Right Now"

Structure:
1. The Trend - Why it's going viral
2. The Science/Psychology - Why it works
3. Social Proof - TikTok/Instagram mentions
4. How to Get It - Feature our product
5. Conclusion - FOMO-inducing CTA

Viral, shareable tone with social media appeal.`,
  };

  const prompt = prompts[postType];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert SEO content writer and digital marketer. Write engaging, conversion-optimized blog content.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2500,
    });

    const content = completion.choices[0].message.content || "";

    // Extract title from first # heading
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : `${product.public_data.title} - Complete Guide`;

    // Generate slug
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Extract keywords from content
    const keywords = extractKeywords(content, product);

    // Generate excerpt (first 150 chars)
    const excerpt = content.replace(/#+ /g, "").split("\n\n")[1]?.substring(0, 150) + "..." || "";

    return {
      title,
      slug,
      content,
      excerpt,
      meta_title: title.substring(0, 60),
      meta_description: excerpt.substring(0, 160),
      keywords,
      post_type: postType,
      categories: [product.public_data.title.split(" ")[0]],
      tags: keywords.slice(0, 5),
      word_count: content.split(/\s+/).length,
      generated_by_ai: true,
      ai_prompt_used: postType,
    };
  } catch (error) {
    console.error("Blog generation error:", error);
    throw error;
  }
}

/**
 * Extract SEO keywords from content
 */
function extractKeywords(content: string, product: Product): string[] {
  const keywords: string[] = [];

  // Add product title variations
  keywords.push(product.public_data.title.toLowerCase());

  // Add features as keywords
  product.public_data.features.forEach((feature) => {
    const words = feature.toLowerCase().split(" ");
    keywords.push(...words.filter((w) => w.length > 4));
  });

  // Common ecommerce keywords
  keywords.push("review", "best", "buy", "cheap", "affordable", "quality");

  // Dedupe and return top 10
  return [...new Set(keywords)].slice(0, 10);
}

/**
 * Firestore Trigger: Auto-generate blog when product published
 */
export const generateProductBlog = functions
  .runWith({
    timeoutSeconds: 180,
    memory: "512MB",
  })
  .firestore.document("products/{productId}")
  .onUpdate(async (change, context) => {
    const newData = change.after.data() as Product;
    const oldData = change.before.data() as Product;
    const productId = context.params.productId;

    // Only trigger when product moves to LIVE status
    if (newData.content_status !== "LIVE" || oldData.content_status === "LIVE") {
      return;
    }

    // Check if user has SEO plugin enabled
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(newData.user_id).get();
    const userData = userDoc.data();

    if (!userData?.active_plugins?.includes("seo_blog_writer")) {
      console.log(`SEO blog plugin not active for user ${newData.user_id}`);
      return;
    }

    try {
      console.log(`Generating blog post for product: ${productId}`);

      // Generate a product review blog post
      const blogData = await generateBlogPost(newData, "product_review");

      // Save to Firestore
      const blogRef = await db.collection("blog_posts").add({
        ...blogData,
        post_id: "",
        user_id: newData.user_id,
        product_id: productId,
        status: "published",
        published_at: FieldValue.serverTimestamp(),
        views: 0,
        shares: 0,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      // Update blog post ID
      await blogRef.update({ post_id: blogRef.id });

      console.log(`Blog post generated: ${blogRef.id}`);

      // Log analytics
      await db.collection("analytics").add({
        event_type: "blog_generated",
        product_id: productId,
        user_id: newData.user_id,
        timestamp: FieldValue.serverTimestamp(),
        metadata: {
          blog_id: blogRef.id,
          word_count: blogData.word_count,
        },
      });
    } catch (error) {
      console.error("Blog generation error:", error);
    }
  });

/**
 * Callable function: Manually generate blog post
 */
export const triggerBlogGeneration = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  const { productId, postType = "product_review" } = data;

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
    const blogData = await generateBlogPost(product, postType);

    // Save to Firestore
    const blogRef = await db.collection("blog_posts").add({
      ...blogData,
      post_id: "",
      user_id: product.user_id,
      product_id: productId,
      status: "published",
      published_at: FieldValue.serverTimestamp(),
      views: 0,
      shares: 0,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    await blogRef.update({ post_id: blogRef.id });

    return {
      success: true,
      blog_id: blogRef.id,
      title: blogData.title,
      slug: blogData.slug,
    };
  } catch (error) {
    console.error("Manual blog generation error:", error);
    throw new functions.https.HttpsError("internal", "Failed to generate blog post");
  }
});

/**
 * Get blog posts for a user
 */
export const getBlogPosts = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  const db = getFirestore();
  const userId = context.auth.uid;

  try {
    const blogsSnapshot = await db
      .collection("blog_posts")
      .where("user_id", "==", userId)
      .where("status", "==", "published")
      .orderBy("published_at", "desc")
      .limit(50)
      .get();

    const blogs: BlogPost[] = [];
    blogsSnapshot.forEach((doc) => {
      blogs.push({
        post_id: doc.id,
        ...doc.data(),
      } as BlogPost);
    });

    return {
      success: true,
      blogs,
      total: blogs.length,
    };
  } catch (error) {
    console.error("Error fetching blogs:", error);
    throw new functions.https.HttpsError("internal", "Failed to fetch blogs");
  }
});
