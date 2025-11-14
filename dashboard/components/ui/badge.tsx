import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-blue-900/30 text-blue-400 border-blue-700',
        success: 'border-transparent bg-green-900/30 text-green-400 border-green-700',
        warning: 'border-transparent bg-yellow-900/30 text-yellow-400 border-yellow-700',
        destructive: 'border-transparent bg-red-900/30 text-red-400 border-red-700',
        secondary: 'border-transparent bg-gray-900/30 text-gray-400 border-gray-700',
        outline: 'text-gray-400 border-gray-700',
        purple: 'border-transparent bg-purple-900/30 text-purple-400 border-purple-700',
        pink: 'border-transparent bg-pink-900/30 text-pink-400 border-pink-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
