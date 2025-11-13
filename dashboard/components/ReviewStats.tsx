'use client';

import { Clock, CheckCircle, XCircle } from 'lucide-react';

interface ReviewStatsProps {
  stats: {
    pending: number;
    approved: number;
    rejected: number;
  };
}

export function ReviewStats({ stats }: ReviewStatsProps) {
  const total = stats.pending + stats.approved + stats.rejected;
  const approvalRate = total > 0 ? ((stats.approved / total) * 100).toFixed(1) : '0.0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-yellow-400 mb-1">Pending Review</p>
            <p className="text-3xl font-bold text-yellow-300">{stats.pending}</p>
          </div>
          <Clock className="w-10 h-10 text-yellow-400 opacity-50" />
        </div>
      </div>

      <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-green-400 mb-1">Approved</p>
            <p className="text-3xl font-bold text-green-300">{stats.approved}</p>
          </div>
          <CheckCircle className="w-10 h-10 text-green-400 opacity-50" />
        </div>
      </div>

      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-red-400 mb-1">Rejected</p>
            <p className="text-3xl font-bold text-red-300">{stats.rejected}</p>
          </div>
          <XCircle className="w-10 h-10 text-red-400 opacity-50" />
        </div>
      </div>

      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-400 mb-1">Approval Rate</p>
            <p className="text-3xl font-bold text-blue-300">{approvalRate}%</p>
          </div>
          <div className="text-4xl">📈</div>
        </div>
      </div>
    </div>
  );
}
