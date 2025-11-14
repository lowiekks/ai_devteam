'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check, X, Edit, Eye, EyeOff, Instagram, Facebook } from 'lucide-react';

interface Product {
  id: string;
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
}

interface ProductReviewCardProps {
  product: Product;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
}

export function ProductReviewCard({ product, onApprove, onReject, onEdit }: ProductReviewCardProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images = showOriginal
    ? product.public_data.original_images || [product.public_data.images[0]]
    : product.public_data.images;

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden backdrop-blur-sm">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* Left: Images */}
        <div className="bg-gray-900/50 p-8 flex flex-col">
          <div className="relative aspect-square bg-gray-800 rounded-lg overflow-hidden mb-4">
            <Image
              src={images[currentImageIndex] || '/placeholder-product.png'}
              alt={product.public_data.title}
              fill
              className="object-contain"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />

            {/* Image Navigation */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-2 h-2 rounded-full transition ${
                      index === currentImageIndex ? 'bg-blue-500' : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Image Controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowOriginal(!showOriginal)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
            >
              {showOriginal ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {showOriginal ? 'Showing Original' : 'Show Original'}
            </button>

            <a
              href={product.monitored_supplier.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:text-blue-300 transition"
            >
              View Source →
            </a>
          </div>
        </div>

        {/* Right: Content */}
        <div className="p-8 flex flex-col">
          {/* Title */}
          <div className="mb-4">
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-2xl font-bold text-white leading-tight">
                {showOriginal
                  ? product.public_data.original_title || product.public_data.title
                  : product.public_data.title}
              </h2>
              <div className="text-xl font-bold text-green-400 ml-4">
                ${product.monitored_supplier.current_price.toFixed(2)}
              </div>
            </div>
            {!showOriginal && (
              <div className="text-xs text-gray-500 italic">
                Original: {product.public_data.original_title}
              </div>
            )}
          </div>

          {/* Short Description (Hook) */}
          {!showOriginal && (
            <div className="mb-6">
              <p className="text-gray-300 text-lg italic leading-relaxed">
                &quot;{product.public_data.short_description}&quot;
              </p>
            </div>
          )}

          {/* Features */}
          <div className="mb-6 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase">Key Features</h3>
            <ul className="space-y-2">
              {product.public_data.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-300">
                  <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Social Media Content */}
          {!showOriginal && product.social_media && (
            <div className="mb-6 space-y-3">
              {product.social_media.instagram_caption && (
                <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 p-3 rounded-lg border border-purple-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Instagram className="w-4 h-4 text-pink-400" />
                    <span className="text-xs font-semibold text-pink-400 uppercase">
                      Instagram
                    </span>
                  </div>
                  <p className="text-sm text-gray-300">{product.social_media.instagram_caption}</p>
                </div>
              )}

              {product.social_media.facebook_post && (
                <div className="bg-gradient-to-r from-blue-900/20 to-blue-800/20 p-3 rounded-lg border border-blue-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Facebook className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-semibold text-blue-400 uppercase">Facebook</span>
                  </div>
                  <p className="text-sm text-gray-300">{product.social_media.facebook_post}</p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-auto grid grid-cols-3 gap-3">
            <button
              onClick={onReject}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-700 rounded-lg transition font-medium"
            >
              <X className="w-5 h-5" />
              Reject
            </button>

            <button
              onClick={onEdit}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition font-medium"
            >
              <Edit className="w-5 h-5" />
              Edit
            </button>

            <button
              onClick={onApprove}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg transition font-bold shadow-[0_0_15px_rgba(0,255,0,0.3)]"
            >
              <Check className="w-5 h-5" />
              Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
