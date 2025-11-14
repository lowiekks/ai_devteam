'use client';

import * as React from 'react';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ExternalLink,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Package,
  DollarSign,
  Calendar,
  Link as LinkIcon,
} from 'lucide-react';

interface Product {
  id: string;
  public_data: {
    title: string;
    short_description?: string;
    long_description?: string;
    features?: string[];
    images?: string[];
    original_title?: string;
    original_description?: string;
  };
  monitored_supplier: {
    url: string;
    current_price: number;
    previous_price?: number;
    platform: string;
  };
  content_status?: string;
  created_at?: any;
  updated_at?: any;
}

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductDetailModal({ product, isOpen, onClose }: ProductDetailModalProps) {
  const [selectedImage, setSelectedImage] = React.useState(0);

  if (!product) return null;

  const priceChange =
    product.monitored_supplier.previous_price &&
    product.monitored_supplier.current_price !== product.monitored_supplier.previous_price
      ? ((product.monitored_supplier.current_price - product.monitored_supplier.previous_price) /
          product.monitored_supplier.previous_price) *
        100
      : null;

  const images = product.public_data.images || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Product Details" size="xl">
      <div className="space-y-6">
        {/* Images Gallery */}
        {images.length > 0 && (
          <div className="space-y-3">
            <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden">
              <img
                src={images[selectedImage]}
                alt={product.public_data.title}
                className="w-full h-full object-contain"
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg border-2 overflow-hidden transition ${
                      selectedImage === idx
                        ? 'border-blue-500'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Product Info */}
        <div>
          <div className="flex items-start justify-between gap-4 mb-3">
            <h3 className="text-2xl font-bold text-white">
              {product.public_data.title}
            </h3>
            {product.content_status && (
              <Badge
                variant={
                  product.content_status === 'LIVE'
                    ? 'success'
                    : product.content_status === 'REVIEW'
                    ? 'warning'
                    : 'default'
                }
              >
                {product.content_status}
              </Badge>
            )}
          </div>

          {product.public_data.short_description && (
            <p className="text-gray-300 mb-4">{product.public_data.short_description}</p>
          )}
        </div>

        {/* Price & Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <DollarSign className="w-4 h-4" />
              <span>Current Price</span>
            </div>
            <div className="text-2xl font-bold text-green-400">
              {formatCurrency(product.monitored_supplier.current_price)}
            </div>
          </div>

          {priceChange !== null && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                {priceChange > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span>Price Change</span>
              </div>
              <div
                className={`text-2xl font-bold ${
                  priceChange > 0 ? 'text-red-400' : 'text-green-400'
                }`}
              >
                {priceChange > 0 ? '+' : ''}
                {priceChange.toFixed(1)}%
              </div>
            </div>
          )}

          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <Package className="w-4 h-4" />
              <span>Platform</span>
            </div>
            <div className="text-lg font-bold text-white capitalize">
              {product.monitored_supplier.platform}
            </div>
          </div>

          {product.created_at && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Calendar className="w-4 h-4" />
                <span>Added</span>
              </div>
              <div className="text-sm font-semibold text-white">
                {formatDate(product.created_at)}
              </div>
            </div>
          )}
        </div>

        {/* Features */}
        {product.public_data.features && product.public_data.features.length > 0 && (
          <div>
            <h4 className="text-lg font-bold text-white mb-3">Key Features</h4>
            <ul className="space-y-2">
              {product.public_data.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-gray-300">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Description */}
        {product.public_data.long_description && (
          <div>
            <h4 className="text-lg font-bold text-white mb-3">Description</h4>
            <p className="text-gray-300 leading-relaxed">
              {product.public_data.long_description}
            </p>
          </div>
        )}

        {/* Original Data (if refined) */}
        {product.public_data.original_title && (
          <div className="bg-yellow-900/10 border border-yellow-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-400 text-sm font-semibold mb-2">
              <AlertCircle className="w-4 h-4" />
              <span>Original Content (Before AI Refinement)</span>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-400">Title: </span>
                <span className="text-gray-300">{product.public_data.original_title}</span>
              </div>
              {product.public_data.original_description && (
                <div>
                  <span className="text-gray-400">Description: </span>
                  <span className="text-gray-300">
                    {product.public_data.original_description}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button
          onClick={() => window.open(product.monitored_supplier.url, '_blank')}
          className="gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          View on {product.monitored_supplier.platform}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
