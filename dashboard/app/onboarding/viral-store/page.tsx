'use client';

import { useState } from 'react';
import { auth, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { TrendingUp, Sparkles, Package } from 'lucide-react';

interface Trend {
  keyword: string;
  hashtag: string;
  views: number;
  growth_rate: number;
  category: string;
}

export default function ViralStoreOnboarding() {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('');
  const [trends, setTrends] = useState<Trend[]>([]);
  const [selectedTrend, setSelectedTrend] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [buildResult, setBuildResult] = useState<any>(null);

  const categories = [
    { id: 'beauty', label: 'Beauty & Skincare', emoji: '💄' },
    { id: 'health', label: 'Health & Fitness', emoji: '💪' },
    { id: 'kitchen', label: 'Kitchen & Home', emoji: '🏠' },
    { id: 'tech', label: 'Tech Gadgets', emoji: '📱' },
    { id: 'fashion', label: 'Fashion & Accessories', emoji: '👗' },
  ];

  const handleCategorySelect = async (categoryId: string) => {
    setCategory(categoryId);
    setLoading(true);

    try {
      const analyzeTrends = httpsCallable(functions, 'analyzeTrends');
      const result: any = await analyzeTrends({ category: categoryId });

      if (result.data.success) {
        setTrends(result.data.trends);
        setStep(2);
      }
    } catch (error) {
      console.error('Error fetching trends:', error);
      alert('Failed to fetch trends');
    } finally {
      setLoading(false);
    }
  };

  const handleBuildStore = async () => {
    if (!selectedTrend) return;

    setLoading(true);

    try {
      const buildViralStore = httpsCallable(functions, 'buildViralStore');
      const result: any = await buildViralStore({
        trendKeyword: selectedTrend,
        productCount: 5,
      });

      if (result.data.success) {
        setBuildResult(result.data);
        setStep(3);
      }
    } catch (error) {
      console.error('Error building store:', error);
      alert('Failed to build store');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-yellow-400" />
            <h1 className="text-2xl font-bold text-white">Viral Store Builder</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        {/* Progress Bar */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    s <= step
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`flex-1 h-1 mx-4 ${
                      s < step ? 'bg-blue-600' : 'bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-2 text-sm text-gray-400">
            <span>Category</span>
            <span>Trend</span>
            <span>Store</span>
          </div>
        </div>

        {/* Step 1: Select Category */}
        {step === 1 && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-3">
                What type of store do you want?
              </h2>
              <p className="text-gray-400 text-lg">
                We&apos;ll find trending products in your chosen category
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  disabled={loading}
                  className="p-8 bg-gray-800/50 border-2 border-gray-700 rounded-lg hover:border-blue-500 hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="text-6xl mb-4">{cat.emoji}</div>
                  <div className="text-xl font-bold text-white group-hover:text-blue-400 transition">
                    {cat.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Trend */}
        {step === 2 && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-3">
                Pick a viral trend
              </h2>
              <p className="text-gray-400 text-lg">
                These products are blowing up on TikTok right now
              </p>
            </div>

            <div className="space-y-4">
              {trends.map((trend, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedTrend(trend.keyword)}
                  className={`w-full p-6 rounded-lg border-2 transition text-left ${
                    selectedTrend === trend.keyword
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                        <h3 className="text-xl font-bold text-white">{trend.keyword}</h3>
                        <span className="px-2 py-1 text-xs bg-purple-900/30 text-purple-400 border border-purple-700 rounded">
                          #{trend.hashtag}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>{(trend.views / 1000000).toFixed(1)}M views</span>
                        <span className="text-green-400">
                          +{trend.growth_rate}% growth
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleBuildStore}
              disabled={!selectedTrend || loading}
              className="w-full mt-8 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(59,130,246,0.4)]"
            >
              {loading ? 'Building Your Store...' : 'Build Viral Store →'}
            </button>
          </div>
        )}

        {/* Step 3: Store Built */}
        {step === 3 && buildResult && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="text-6xl mb-6">🎉</div>
            <h2 className="text-3xl font-bold text-white mb-3">
              Your Viral Store is Ready!
            </h2>
            <p className="text-gray-400 text-lg mb-8">
              {buildResult.message}
            </p>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 mb-8">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Store Name</div>
                  <div className="text-xl font-bold text-white">
                    {buildResult.branding?.store_name}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Products Added</div>
                  <div className="text-xl font-bold text-green-400">
                    {buildResult.products_imported}
                  </div>
                </div>
              </div>

              <div className="text-left">
                <div className="text-sm text-gray-400 mb-2">Tagline</div>
                <div className="text-lg text-gray-300 italic mb-4">
                  &quot;{buildResult.branding?.tagline}&quot;
                </div>

                <div className="text-sm text-gray-400 mb-2">Description</div>
                <div className="text-gray-300">
                  {buildResult.branding?.description}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <a
                href="/"
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition font-medium"
              >
                View Dashboard
              </a>
              <a
                href="/review"
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition font-bold"
              >
                Review Products →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
