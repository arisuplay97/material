import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Exact Cloudflare Kumo UI Button (matching "Buy domain" & "Add domain" / "+ Add a chart"):
 * - rounded-lg (8px)
 * - Primary ("Add domain"): #1368f6 fill, #0952cc 1px border, white text
 * - Outline ("Buy domain" / "Add filter" / "Print"): pure white fill, #e4e4e7 1px border, #18181b text
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-[13px] font-medium transition-colors duration-100 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1368f6]/25 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-[#1368f6] hover:bg-[#0b57d6] active:bg-[#0849b8] text-white border border-[#0952cc] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]',
        destructive:
          'bg-[#dc2626] hover:bg-[#b91c1c] text-white border border-[#b91c1c] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]',
        outline:
          'bg-white dark:bg-zinc-900 hover:bg-[#f4f4f5]/70 dark:hover:bg-zinc-800/80 text-[#18181b] dark:text-zinc-100 border border-[#e4e4e7] dark:border-zinc-700 font-normal [&_svg]:text-[#52525b] dark:[&_svg]:text-zinc-400',
        secondary:
          'bg-[#f4f4f5] hover:bg-[#e4e4e7]/70 text-[#18181b] dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 border border-[#e4e4e7] dark:border-zinc-700',
        ghost:
          'border border-transparent bg-transparent hover:bg-[#f4f4f5] dark:hover:bg-zinc-800 text-[#52525b] dark:text-zinc-400 hover:text-[#18181b] dark:hover:text-zinc-100 font-normal',
        link: 'text-[#1368f6] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-8.5 px-3.5 py-1.5 text-[13px]',
        sm: 'h-8 rounded-lg px-3 text-[12.5px]',
        lg: 'h-9.5 rounded-lg px-4 text-[13.5px]',
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
