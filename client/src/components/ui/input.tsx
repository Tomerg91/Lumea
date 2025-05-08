import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const inputVariants = cva(
  'flex w-full rounded-md border border-input bg-background text-base md:text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
  {
    variants: {
      variant: {
        default: '',
        elegant: 'elegant-input',
        filled: 'bg-secondary/30 dark:bg-secondary border-transparent focus-visible:bg-background',
        ghost: 'border-transparent shadow-none focus-visible:bg-background/50',
        lumea:
          'border-[theme(colors.lumea.taupe.300)] dark:border-[theme(colors.lumea.stone.600/30)] focus-visible:border-accent focus-visible:ring-accent',
      },
      size: {
        default: 'h-10 px-3 py-2',
        sm: 'h-9 px-3 py-1.5 text-xs',
        lg: 'h-11 px-4 py-2.5 text-base',
        xl: 'h-12 px-5 py-3 text-lg',
      },
      radius: {
        default: 'rounded-md',
        sm: 'rounded-sm',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        full: 'rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      radius: 'default',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, size, radius, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, size, radius, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input, inputVariants };
