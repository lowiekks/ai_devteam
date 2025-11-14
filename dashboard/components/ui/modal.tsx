'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-7xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
}: ModalProps) {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full bg-gray-900 border border-gray-700 rounded-xl shadow-2xl animate-in zoom-in-95 fade-in',
          sizeClasses[size]
        )}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
            <div>
              {title && (
                <h2 className="text-xl font-bold text-white">{title}</h2>
              )}
              {description && (
                <p className="text-sm text-gray-400 mt-1">{description}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

export function ModalFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700 bg-gray-800/50', className)}>
      {children}
    </div>
  );
}
