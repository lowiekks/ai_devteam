'use client';

import { Product } from '@/types/product';
import { Activity, Zap, AlertTriangle, TrendingUp } from 'lucide-react';

interface StatsCardsProps {
  products: Product[];
}

export default function StatsCards({ products }: StatsCardsProps) {
  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.monitored_supplier.status === 'ACTIVE').length;
  const removedProducts = products.filter((p) => p.monitored_supplier.status === 'REMOVED').length;
  const autoHealedCount = products.filter((p) =>
    p.automation_log.some((log) => log.action === 'AUTO_HEAL')
  ).length;
  const avgRiskScore =
    products.length > 0
      ? Math.round(
          products.reduce((sum, p) => sum + (p.ai_insights?.risk_score || 50), 0) / products.length
        )
      : 0;

  const stats = [
    {
      label: 'Total Products',
      value: totalProducts,
      icon: Activity,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
      borderColor: 'border-blue-700',
    },
    {
      label: 'Active Monitoring',
      value: activeProducts,
      icon: TrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
      borderColor: 'border-green-700',
    },
    {
      label: 'Auto-Healed',
      value: autoHealedCount,
      icon: Zap,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/20',
      borderColor: 'border-yellow-700',
    },
    {
      label: 'Avg Risk Score',
      value: `${avgRiskScore}%`,
      icon: AlertTriangle,
      color: avgRiskScore > 60 ? 'text-red-400' : 'text-gray-400',
      bgColor: avgRiskScore > 60 ? 'bg-red-900/20' : 'bg-gray-800/20',
      borderColor: avgRiskScore > 60 ? 'border-red-700' : 'border-gray-700',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className={`rounded-lg border ${stat.borderColor} ${stat.bgColor} backdrop-blur-sm p-6 transition-all hover:scale-105`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">{stat.label}</p>
                <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
              <Icon className={`w-10 h-10 ${stat.color} opacity-50`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
