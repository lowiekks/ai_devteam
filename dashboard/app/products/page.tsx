'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { auth, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { onAuthStateChanged } from 'firebase/auth';
import { ProductDetailModal } from '@/components/ProductDetailModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { formatCurrency, formatDate, truncate } from '@/lib/utils';
import {
  Search,
  Filter,
  Plus,
  Eye,
  TrendingUp,
  TrendingDown,
  Package,
  AlertCircle,
} from 'lucide-react';

interface Product {
  id: string;
  public_data: {
    title: string;
    short_description?: string;
    images?: string[];
  };
  monitored_supplier: {
    url: string;
    current_price: number;
    previous_price?: number;
    platform: string;
  };
  content_status: string;
  created_at: any;
}

export default function ProductsPage() {
  const { showToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const getMonitoredProducts = httpsCallable(functions, 'getMonitoredProducts');
      const result: any = await getMonitoredProducts();

      if (result.data.success) {
        setProducts(result.data.products);
        setFilteredProducts(result.data.products);
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Failed to load products',
        message: 'Please try again later.',
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await loadProducts();
      }
    });

    return () => unsubscribe();
  }, [loadProducts]);

  useEffect(() => {
    let filtered = products;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((p) =>
        p.public_data.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.content_status === statusFilter);
    }

    setFilteredProducts(filtered);
  }, [searchQuery, statusFilter, products]);

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Products</h1>
          <p className="text-gray-400">Manage your monitored products</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="LIVE">Live</option>
            <option value="REVIEW">Review</option>
            <option value="PROCESSING">Processing</option>
            <option value="RAW_IMPORT">Raw Import</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Products</span>
            <Package className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{products.length}</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Live</span>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {products.filter((p) => p.content_status === 'LIVE').length}
          </div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">In Review</span>
            <AlertCircle className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {products.filter((p) => p.content_status === 'REVIEW').length}
          </div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Processing</span>
            <TrendingDown className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {products.filter((p) => p.content_status === 'PROCESSING').length}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <Skeleton className="w-full aspect-video mb-4" />
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-12 text-center">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No products found</h3>
          <p className="text-gray-400 mb-6">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Add your first product to get started'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const priceChange = product.monitored_supplier.previous_price
              ? ((product.monitored_supplier.current_price -
                  product.monitored_supplier.previous_price) /
                  product.monitored_supplier.previous_price) *
                100
              : null;

            return (
              <div
                key={product.id}
                className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden hover:border-gray-600 transition group"
              >
                {/* Image */}
                {product.public_data.images && product.public_data.images[0] && (
                  <div className="relative aspect-video bg-gray-900 overflow-hidden">
                    <Image
                      src={product.public_data.images[0]}
                      alt={product.public_data.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <Badge
                      variant={
                        product.content_status === 'LIVE'
                          ? 'success'
                          : product.content_status === 'REVIEW'
                          ? 'warning'
                          : 'default'
                      }
                      className="absolute top-2 right-2 z-10"
                    >
                      {product.content_status}
                    </Badge>
                  </div>
                )}

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
                    {product.public_data.title}
                  </h3>
                  {product.public_data.short_description && (
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                      {product.public_data.short_description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-2xl font-bold text-green-400">
                        {formatCurrency(product.monitored_supplier.current_price)}
                      </div>
                      {priceChange !== null && (
                        <div
                          className={`text-xs font-medium ${
                            priceChange > 0 ? 'text-red-400' : 'text-green-400'
                          }`}
                        >
                          {priceChange > 0 ? '+' : ''}
                          {priceChange.toFixed(1)}%
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {product.monitored_supplier.platform}
                    </Badge>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => handleViewProduct(product)}
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
