'use client';

import { Star, Check, Download } from 'lucide-react';

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

interface PluginCardProps {
  plugin: Plugin;
  onInstall: (pluginId: string) => void;
  onUninstall: (pluginId: string) => void;
}

export function PluginCard({ plugin, onInstall, onUninstall }: PluginCardProps) {
  const categoryColors: Record<string, string> = {
    automation: 'bg-purple-900/30 text-purple-400 border-purple-700',
    marketing: 'bg-pink-900/30 text-pink-400 border-pink-700',
    analytics: 'bg-blue-900/30 text-blue-400 border-blue-700',
    content: 'bg-green-900/30 text-green-400 border-green-700',
    integration: 'bg-yellow-900/30 text-yellow-400 border-yellow-700',
  };

  const categoryColor = categoryColors[plugin.category] || 'bg-gray-900/30 text-gray-400 border-gray-700';

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 hover:border-gray-600 transition">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white mb-1">{plugin.name}</h3>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded border ${categoryColor}`}>
              {plugin.category}
            </span>
            {plugin.rating && (
              <div className="flex items-center gap-1 text-xs text-yellow-400">
                <Star className="w-3 h-3 fill-current" />
                <span>{plugin.rating.toFixed(1)}</span>
              </div>
            )}
            <span className="text-xs text-gray-500">
              {plugin.installs.toLocaleString()} installs
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-400">
            ${plugin.monthly_cost}
          </div>
          <div className="text-xs text-gray-500">/month</div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-300 mb-4 leading-relaxed">
        {plugin.description}
      </p>

      {/* Features */}
      <div className="mb-4">
        <div className="text-xs font-semibold text-gray-400 mb-2 uppercase">Features</div>
        <ul className="space-y-2">
          {plugin.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
              <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Button */}
      {plugin.is_installed ? (
        <button
          onClick={() => onUninstall(plugin.plugin_id)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition font-medium"
        >
          <Check className="w-5 h-5" />
          Installed - Click to Uninstall
        </button>
      ) : (
        <button
          onClick={() => onInstall(plugin.plugin_id)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition font-bold shadow-[0_0_15px_rgba(59,130,246,0.3)]"
        >
          <Download className="w-5 h-5" />
          Install Plugin
        </button>
      )}
    </div>
  );
}
