import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Cloudflare Kumo UI Button Primitives
 * Crisp 6px radius (rounded-md), tactile 1px border + subtle top inner highlight,
 * high-density compact sizing, zero decorative gradients or pill bloat.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-xs font-medium transition-colors duration-100 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0 active:translate-y-[0.5px]',
  {
    variants: {
      variant: {
        default:
          'bg-[#055AD4] hover:bg-[#044BB3] dark:bg-[#2563EB] dark:hover:bg-[#1D4ED8] text-white border border-[#0344A3] dark:border-[#3B82F6]/60 shadow-[0_1px_1px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.14)]',
        destructive:
          'bg-[#DC2626] hover:bg-[#B91C1C] text-white border border-[#B91C1C] shadow-[0_1px_1px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.12)]',
        outline:
          'bg-card hover:bg-muted/75 text-foreground border border-border hover:border-neutral-300 dark:hover:border-neutral-700 shadow-[0_1px_1px_rgba(0,0,0,0.03)]',
        secondary:
          'bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:hover:bg-neutral-200 dark:text-neutral-900 border border-neutral-950 dark:border-white/80 shadow-[0_1px_1px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.1)]',
        ghost:
          'border border-transparent bg-transparent hover:bg-muted/80 text-muted-foreground hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-8.5 px-3.5 py-1.5 text-xs',
        sm: 'h-7.5 rounded-md px-2.5 text-xs',
        lg: 'h-9.5 rounded-md px-4 text-sm',
        icon: 'h-8.5 w-8.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
