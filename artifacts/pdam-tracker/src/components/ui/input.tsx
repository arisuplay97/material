import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-8.5 w-full rounded-lg border border-[#e4e4e7] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1 text-[13px] text-[#18181b] dark:text-zinc-100 transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground placeholder:text-[#a1a1aa] hover:border-[#d4d4d8] dark:hover:border-zinc-600 focus-visible:outline-none focus-visible:border-[#1368f6] focus-visible:ring-2 focus-visible:ring-[#1368f6]/15 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
