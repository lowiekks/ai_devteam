'use client';

import { useEffect, useState } from 'react';
import { auth, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import DashboardTable from '@/components/DashboardTable';
import StatsCards from '@/components/StatsCards';
import { Product } from '@/types/product';

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await loadProducts();
      } else {
        // Auto sign-in anonymously for demo
        await signInAnonymously(auth);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const getMonitoredProducts = httpsCallable<void, { success: boolean; products: Product[] }>(functions, 'getMonitoredProducts');
      const result = await getMonitoredProducts();

      if (result.data.success) {
        setProducts(result.data.products);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Dropship Monitor
              </h1>
              <p className="text-sm text-gray-400">Enterprise AI-Powered Automation</p>
            </div>
            <div className="flex items-center gap-4">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
                Add Product
              </button>
              <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition">
                Settings
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Stats Cards */}
        <StatsCards products={products} />

        {/* Dashboard Table */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Monitored Products</h2>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search products..."
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>All Status</option>
                <option>Active</option>
                <option>Removed</option>
                <option>Price Changed</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="bg-gray-800/50 rounded-lg p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-400 mt-4">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="bg-gray-800/50 rounded-lg p-12 text-center">
              <p className="text-gray-400 text-lg">No products being monitored yet.</p>
              <button className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
                Add Your First Product
              </button>
            </div>
          ) : (
            <DashboardTable products={products} onRefresh={loadProducts} />
          )}
        </div>
      </main>
    </div>
  );
}
