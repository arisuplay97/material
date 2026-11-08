import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Exact Cloudflare Kumo UI Badge (matching "New" / "No data" subtle pills in Cloudflare):
 */
const badgeVariants = cva(
  'whitespace-nowrap inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors focus:outline-none',
  {
    variants: {
      variant: {
        default:
          'border-[#d4d4d8] border-dashed bg-white dark:bg-zinc-900 text-[#18181b] dark:text-zinc-200 dark:border-zinc-700',
        secondary:
          'border-[#e4e4e7] bg-[#f4f4f5] text-[#52525b] dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300',
        destructive:
          'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300',
        outline:
          'text-[#52525b] dark:text-zinc-300 border-[#e4e4e7] dark:border-zinc-700 bg-white dark:bg-zinc-900',
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
