'use client';

import { Product } from '@/types/product';
import { Zap, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface DashboardTableProps {
  products: Product[];
  onRefresh: () => void;
}

export default function DashboardTable({ products, onRefresh }: DashboardTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-700">
            ACTIVE
          </span>
        );
      case 'REMOVED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-900/30 text-red-400 border border-red-700 animate-pulse-soft">
            <AlertCircle className="w-3 h-3 mr-1" />
            REMOVED
          </span>
        );
      case 'PRICE_CHANGED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-400 border border-yellow-700">
            PRICE CHANGED
          </span>
        );
      case 'OUT_OF_STOCK':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-900/30 text-orange-400 border border-orange-700">
            OUT OF STOCK
          </span>
        );
      default:
        return null;
    }
  };

  const getRiskColor = (score: number) => {
    if (score < 20) return 'bg-green-500';
    if (score < 40) return 'bg-blue-500';
    if (score < 60) return 'bg-yellow-500';
    if (score < 80) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getLastAction = (log: any[]) => {
    if (!log || log.length === 0) return null;
    return log[log.length - 1];
  };

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-900/50">
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                AI Risk Score
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Last Automation
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {products.map((product) => {
              const lastAction = getLastAction(product.automation_log);
              const riskScore = product.ai_insights?.risk_score || 50;

              return (
                <tr
                  key={product.product_id}
                  className="hover:bg-gray-700/30 transition-colors"
                >
                  {/* Product */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={product.original_image_url}
                        alt={product.name}
                        className="w-12 h-12 rounded-lg object-cover border border-gray-600"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-product.png';
                        }}
                      />
                      <div>
                        <div className="text-sm font-medium text-white line-clamp-1">
                          {product.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {product.platform === 'shopify' ? 'Shopify' : 'WooCommerce'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    {getStatusBadge(product.monitored_supplier.status)}
                  </td>

                  {/* Price */}
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-white">
                      ${product.monitored_supplier.current_price.toFixed(2)}
                    </div>
                    {lastAction?.action === 'PRICE_UPDATE' && (
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                        {lastAction.new_value > lastAction.old_value ? (
                          <TrendingUp className="w-3 h-3 text-red-400" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-green-400" />
                        )}
                        <span>
                          from ${lastAction.old_value?.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Risk Score */}
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {riskScore < 20 && 'Very Low'}
                          {riskScore >= 20 && riskScore < 40 && 'Low'}
                          {riskScore >= 40 && riskScore < 60 && 'Medium'}
                          {riskScore >= 60 && riskScore < 80 && 'High'}
                          {riskScore >= 80 && 'Very High'}
                        </span>
                        <span className="text-xs font-medium text-gray-300">
                          {riskScore}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${getRiskColor(riskScore)}`}
                          style={{ width: `${100 - riskScore}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>

                  {/* Last Automation */}
                  <td className="px-6 py-4">
                    {lastAction?.action === 'AUTO_HEAL' && (
                      <div className="flex items-center gap-2 text-sm text-green-400">
                        <Zap className="w-4 h-4" />
                        <span>Auto-Healed</span>
                      </div>
                    )}
                    {lastAction?.action === 'PRICE_UPDATE' && (
                      <div className="text-sm text-yellow-400">
                        Price Updated
                      </div>
                    )}
                    {lastAction?.action === 'PRODUCT_REMOVED' && (
                      <div className="text-sm text-red-400">
                        Product Removed
                      </div>
                    )}
                    {!lastAction && (
                      <span className="text-xs text-gray-500">No actions yet</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <button className="text-sm text-blue-400 hover:text-blue-300 transition">
                      View Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Refresh footer */}
      <div className="px-6 py-4 bg-gray-900/30 border-t border-gray-700 flex items-center justify-between">
        <div className="text-sm text-gray-400">
          {products.length} product{products.length !== 1 ? 's' : ''} being monitored
        </div>
        <button
          onClick={onRefresh}
          className="text-sm text-blue-400 hover:text-blue-300 transition"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
