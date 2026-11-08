import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Cloudflare Kumo UI Badge Primitives
 * Compact 6px radius (rounded-md), crisp 1px tinted border, high legibility.
 */
const badgeVariants = cva(
  'whitespace-nowrap inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30',
  {
    variants: {
      variant: {
        default:
          'border-[#055AD4]/20 bg-[#055AD4]/10 text-[#055AD4] dark:border-blue-400/25 dark:bg-blue-500/15 dark:text-blue-300',
        secondary:
          'border-border bg-muted text-muted-foreground',
        destructive:
          'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300',
        outline:
          'text-foreground border-border bg-card',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
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
