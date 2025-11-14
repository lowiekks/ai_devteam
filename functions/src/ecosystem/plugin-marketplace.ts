/**
 * Plugin Marketplace - Monetization Engine
 * Handles plugin installation, billing, and feature gates
 * Enables SaaS revenue through feature upsells
 */

import * as functions from "firebase-functions";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { BUILTIN_PLUGINS, Plugin, UserPlugin } from "../../../shared/types/plugins";

/**
 * Initialize built-in plugins in database (run once on deployment)
 */
export const initializePlugins = functions.https.onRequest(async (req, res) => {
  // Security: Only allow from admin
  const adminKey = req.headers["x-admin-key"];
  if (adminKey !== process.env.ADMIN_KEY) {
    res.status(403).send("Forbidden");
    return;
  }

  const db = getFirestore();
  const batch = db.batch();

  for (const plugin of BUILTIN_PLUGINS) {
    const pluginRef = db.collection("plugins").doc(plugin.plugin_id);
    batch.set(pluginRef, {
      ...plugin,
      installs: 0,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  res.json({
    success: true,
    message: `Initialized ${BUILTIN_PLUGINS.length} plugins`,
  });
});

/**
 * Get all available plugins
 */
export const getMarketplacePlugins = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  const db = getFirestore();
  const userId = context.auth.uid;

  try {
    // Get all active plugins
    const pluginsSnapshot = await db
      .collection("plugins")
      .where("is_active", "==", true)
      .orderBy("installs", "desc")
      .get();

    const plugins: Plugin[] = [];
    pluginsSnapshot.forEach((doc) => {
      plugins.push({
        plugin_id: doc.id,
        ...doc.data(),
      } as Plugin);
    });

    // Get user's installed plugins
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    const installedPlugins = userData?.active_plugins || [];

    // Mark which plugins are installed
    const pluginsWithStatus = plugins.map((plugin) => ({
      ...plugin,
      is_installed: installedPlugins.includes(plugin.plugin_id),
    }));

    return {
      success: true,
      plugins: pluginsWithStatus,
    };
  } catch (error) {
    console.error("Error fetching plugins:", error);
    throw new functions.https.HttpsError("internal", "Failed to fetch plugins");
  }
});

/**
 * Install a plugin
 */
export const installPlugin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  const { pluginId } = data;

  if (!pluginId) {
    throw new functions.https.HttpsError("invalid-argument", "pluginId is required");
  }

  const db = getFirestore();
  const userId = context.auth.uid;

  try {
    // Get plugin details
    const pluginDoc = await db.collection("plugins").doc(pluginId).get();

    if (!pluginDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Plugin not found");
    }

    const plugin = pluginDoc.data() as Plugin;

    // Check if already installed
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    if (userData?.active_plugins?.includes(pluginId)) {
      throw new functions.https.HttpsError("already-exists", "Plugin already installed");
    }

    // Create user_plugin record
    const userPluginRef = await db.collection("user_plugins").add({
      user_plugin_id: "",
      user_id: userId,
      plugin_id: pluginId,
      is_active: true,
      installed_at: FieldValue.serverTimestamp(),
      usage_count: 0,
    } as Partial<UserPlugin>);

    await userPluginRef.update({ user_plugin_id: userPluginRef.id });

    // Add to user's active_plugins array
    await db
      .collection("users")
      .doc(userId)
      .update({
        active_plugins: FieldValue.arrayUnion(pluginId),
      });

    // Increment install count
    await db
      .collection("plugins")
      .doc(pluginId)
      .update({
        installs: FieldValue.increment(1),
      });

    // TODO: Create Stripe subscription item if plugin has monthly_cost > 0
    // if (plugin.monthly_cost > 0) {
    //   await createStripeSubscriptionItem(userId, plugin);
    // }

    // Log analytics
    await db.collection("analytics").add({
      event_type: "plugin_installed",
      user_id: userId,
      timestamp: FieldValue.serverTimestamp(),
      metadata: {
        plugin_id: pluginId,
        plugin_name: plugin.name,
        monthly_cost: plugin.monthly_cost,
      },
    });

    return {
      success: true,
      message: `${plugin.name} installed successfully!`,
      plugin: {
        name: plugin.name,
        monthly_cost: plugin.monthly_cost,
      },
    };
  } catch (error: any) {
    console.error("Install plugin error:", error);
    if (error.code) throw error;
    throw new functions.https.HttpsError("internal", "Failed to install plugin");
  }
});

/**
 * Uninstall a plugin
 */
export const uninstallPlugin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  const { pluginId } = data;

  if (!pluginId) {
    throw new functions.https.HttpsError("invalid-argument", "pluginId is required");
  }

  const db = getFirestore();
  const userId = context.auth.uid;

  try {
    // Remove from user's active_plugins
    await db
      .collection("users")
      .doc(userId)
      .update({
        active_plugins: FieldValue.arrayRemove(pluginId),
      });

    // Mark user_plugin as inactive
    const userPluginSnapshot = await db
      .collection("user_plugins")
      .where("user_id", "==", userId)
      .where("plugin_id", "==", pluginId)
      .where("is_active", "==", true)
      .get();

    if (!userPluginSnapshot.empty) {
      const userPluginDoc = userPluginSnapshot.docs[0];
      await userPluginDoc.ref.update({
        is_active: false,
        uninstalled_at: FieldValue.serverTimestamp(),
      });
    }

    // Decrement install count
    await db
      .collection("plugins")
      .doc(pluginId)
      .update({
        installs: FieldValue.increment(-1),
      });

    // TODO: Cancel Stripe subscription item
    // await cancelStripeSubscriptionItem(userId, pluginId);

    return {
      success: true,
      message: "Plugin uninstalled successfully",
    };
  } catch (error) {
    console.error("Uninstall plugin error:", error);
    throw new functions.https.HttpsError("internal", "Failed to uninstall plugin");
  }
});

/**
 * Check if user has a specific plugin installed
 * Used by other cloud functions to gate features
 */
export async function hasPlugin(userId: string, pluginId: string): Promise<boolean> {
  const db = getFirestore();

  try {
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    return userData?.active_plugins?.includes(pluginId) || false;
  } catch (error) {
    console.error("Error checking plugin:", error);
    return false;
  }
}

/**
 * Track plugin usage (for metered billing)
 */
export async function trackPluginUsage(userId: string, pluginId: string): Promise<void> {
  const db = getFirestore();

  try {
    const userPluginSnapshot = await db
      .collection("user_plugins")
      .where("user_id", "==", userId)
      .where("plugin_id", "==", pluginId)
      .where("is_active", "==", true)
      .get();

    if (!userPluginSnapshot.empty) {
      const userPluginDoc = userPluginSnapshot.docs[0];
      await userPluginDoc.ref.update({
        usage_count: FieldValue.increment(1),
        last_used_at: FieldValue.serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Error tracking plugin usage:", error);
  }
}

/**
 * Get user's installed plugins with usage stats
 */
export const getMyPlugins = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  const db = getFirestore();
  const userId = context.auth.uid;

  try {
    // Get user's active plugins
    const userPluginsSnapshot = await db
      .collection("user_plugins")
      .where("user_id", "==", userId)
      .where("is_active", "==", true)
      .get();

    const plugins: any[] = [];

    for (const doc of userPluginsSnapshot.docs) {
      const userPlugin = doc.data() as UserPlugin;

      // Get plugin details
      const pluginDoc = await db.collection("plugins").doc(userPlugin.plugin_id).get();
      const pluginData = pluginDoc.data() as Plugin;

      plugins.push({
        ...userPlugin,
        plugin_name: pluginData.name,
        plugin_description: pluginData.description,
        monthly_cost: pluginData.monthly_cost,
        features: pluginData.features,
      });
    }

    // Calculate total monthly cost
    const totalCost = plugins.reduce((sum, p) => sum + p.monthly_cost, 0);

    return {
      success: true,
      plugins,
      total_cost: totalCost,
    };
  } catch (error) {
    console.error("Error fetching user plugins:", error);
    throw new functions.https.HttpsError("internal", "Failed to fetch plugins");
  }
});
