'use client';

import { Package, DollarSign } from 'lucide-react';

interface Plugin {
  plugin_id: string;
  name: string;
  monthly_cost: number;
}

interface MyPluginsPanelProps {
  installedPlugins: Plugin[];
  totalCost: number;
  onUninstall: (pluginId: string) => void;
}

export function MyPluginsPanel({ installedPlugins, totalCost, onUninstall }: MyPluginsPanelProps) {
  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 sticky top-6">
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-bold text-white">My Plugins</h2>
      </div>

      {installedPlugins.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📦</div>
          <p className="text-sm text-gray-400">No plugins installed yet</p>
        </div>
      ) : (
        <>
          {/* Total Cost */}
          <div className="mb-4 p-4 bg-green-900/20 border border-green-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-300">Monthly Total</span>
              </div>
              <span className="text-xl font-bold text-green-400">
                ${totalCost.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Installed Plugins List */}
          <div className="space-y-3">
            {installedPlugins.map((plugin) => (
              <div
                key={plugin.plugin_id}
                className="p-3 bg-gray-900/50 border border-gray-700 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{plugin.name}</div>
                    <div className="text-xs text-gray-400">${plugin.monthly_cost}/mo</div>
                  </div>
                </div>
                <button
                  onClick={() => onUninstall(plugin.plugin_id)}
                  className="w-full text-xs text-red-400 hover:text-red-300 transition"
                >
                  Uninstall
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
