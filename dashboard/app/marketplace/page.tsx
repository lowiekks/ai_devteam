'use client';

import { useEffect, useState } from 'react';
import { auth, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { onAuthStateChanged } from 'firebase/auth';
import { PluginCard } from '@/components/PluginCard';
import { MyPluginsPanel } from '@/components/MyPluginsPanel';

interface Plugin {
  plugin_id: string;
  name: string;
  description: string;
  category: string;
  monthly_cost: number;
  features: string[];
  is_installed: boolean;
  rating?: number;
  installs: number;
}

export default function MarketplacePage() {
  const [user, setUser] = useState<any>(null);
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await loadPlugins();
      }
    });

    return () => unsubscribe();
  }, []);

  const loadPlugins = async () => {
    try {
      setLoading(true);
      const getMarketplacePlugins = httpsCallable(functions, 'getMarketplacePlugins');
      const result: any = await getMarketplacePlugins();

      if (result.data.success) {
        setPlugins(result.data.plugins);
      }
    } catch (error) {
      console.error('Error loading plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async (pluginId: string) => {
    try {
      const installPlugin = httpsCallable(functions, 'installPlugin');
      const result: any = await installPlugin({ pluginId });

      if (result.data.success) {
        // Refresh plugins list
        await loadPlugins();
        alert(result.data.message);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to install plugin');
    }
  };

  const handleUninstall = async (pluginId: string) => {
    if (!confirm('Are you sure you want to uninstall this plugin?')) return;

    try {
      const uninstallPlugin = httpsCallable(functions, 'uninstallPlugin');
      await uninstallPlugin({ pluginId });

      await loadPlugins();
    } catch (error: any) {
      alert(error.message || 'Failed to uninstall plugin');
    }
  };

  const categories = ['all', 'automation', 'marketing', 'analytics', 'content', 'integration'];

  const filteredPlugins =
    selectedCategory === 'all'
      ? plugins
      : plugins.filter((p) => p.category === selectedCategory);

  const installedPlugins = plugins.filter((p) => p.is_installed);
  const totalMonthlyCost = installedPlugins.reduce((sum, p) => sum + p.monthly_cost, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Plugin Marketplace</h1>
              <p className="text-sm text-gray-400">
                Supercharge your store with powerful add-ons
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-gray-400">Monthly Cost</div>
                <div className="text-xl font-bold text-green-400">${totalMonthlyCost.toFixed(2)}</div>
              </div>
              <a
                href="/"
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - My Plugins */}
          <div className="lg:col-span-1">
            <MyPluginsPanel
              installedPlugins={installedPlugins}
              totalCost={totalMonthlyCost}
              onUninstall={handleUninstall}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Category Filter */}
            <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg transition whitespace-nowrap ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>

            {/* Plugins Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-400 mt-4">Loading plugins...</p>
              </div>
            ) : filteredPlugins.length === 0 ? (
              <div className="text-center py-12 bg-gray-800/50 rounded-lg border border-gray-700">
                <p className="text-gray-400">No plugins found in this category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredPlugins.map((plugin) => (
                  <PluginCard
                    key={plugin.plugin_id}
                    plugin={plugin}
                    onInstall={handleInstall}
                    onUninstall={handleUninstall}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
