'use client';

import { useEffect, useState } from 'react';
import { auth, functions, firestore } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, updateDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ProductReviewCard } from '@/components/ProductReviewCard';
import { ReviewStats } from '@/components/ReviewStats';

interface Product {
  id: string;
  content_status: string;
  public_data: {
    title: string;
    short_description: string;
    features: string[];
    images: string[];
    original_title?: string;
    original_description?: string;
    original_images?: string[];
  };
  social_media?: {
    instagram_caption?: string;
    facebook_post?: string;
  };
  monitored_supplier: {
    url: string;
    current_price: number;
  };
  created_at: any;
}

export default function ReviewPage() {
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await loadReviewQueue();
      }
    });

    return () => unsubscribe();
  }, []);

  const loadReviewQueue = async () => {
    try {
      setLoading(true);

      // Fetch products in REVIEW status
      const getReviewQueue = httpsCallable(functions, 'getReviewQueue');
      const result: any = await getReviewQueue();

      if (result.data.success) {
        setProducts(result.data.products);
        setStats(result.data.stats);
      }
    } catch (error) {
      console.error('Error loading review queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    const product = products[currentIndex];
    if (!product) return;

    try {
      const approveProduct = httpsCallable(functions, 'approveProduct');
      await approveProduct({ productId: product.id });

      setStats((prev) => ({
        ...prev,
        pending: prev.pending - 1,
        approved: prev.approved + 1,
      }));

      moveToNext();
    } catch (error) {
      console.error('Error approving product:', error);
    }
  };

  const handleReject = async () => {
    const product = products[currentIndex];
    if (!product) return;

    try {
      const rejectProduct = httpsCallable(functions, 'rejectProduct');
      await rejectProduct({ productId: product.id });

      setStats((prev) => ({
        ...prev,
        pending: prev.pending - 1,
        rejected: prev.rejected + 1,
      }));

      moveToNext();
    } catch (error) {
      console.error('Error rejecting product:', error);
    }
  };

  const handleEdit = () => {
    // TODO: Open edit modal
    alert('Edit functionality coming soon!');
  };

  const moveToNext = () => {
    if (currentIndex < products.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // All products reviewed
      setCurrentIndex(0);
      loadReviewQueue(); // Reload queue
    }
  };

  const moveToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading review queue...</div>
      </div>
    );
  }

  const currentProduct = products[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Product Review Queue</h1>
              <p className="text-sm text-gray-400">Tinder for Products - Swipe to Approve!</p>
            </div>
            <a
              href="/"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="container mx-auto px-6 py-6">
        <ReviewStats stats={stats} />
      </div>

      {/* Main Review Area */}
      <div className="container mx-auto px-6 py-8">
        {!currentProduct ? (
          <div className="bg-gray-800/50 rounded-lg p-12 text-center border border-gray-700">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-white mb-2">All Caught Up!</h2>
            <p className="text-gray-400 mb-6">
              No products pending review. Great job!
            </p>
            <button
              onClick={loadReviewQueue}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              Refresh Queue
            </button>
          </div>
        ) : (
          <div>
            {/* Progress Indicator */}
            <div className="mb-6 flex items-center justify-between">
              <div className="text-gray-400 text-sm">
                Product {currentIndex + 1} of {products.length}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={moveToPrevious}
                  disabled={currentIndex === 0}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <button
                  onClick={moveToNext}
                  disabled={currentIndex === products.length - 1}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>

            {/* Product Review Card */}
            <ProductReviewCard
              product={currentProduct}
              onApprove={handleApprove}
              onReject={handleReject}
              onEdit={handleEdit}
            />
          </div>
        )}
      </div>
    </div>
  );
}
