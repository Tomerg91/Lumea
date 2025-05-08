import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary-dark',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary-dark',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground border-border',
        accent: 'border-transparent bg-accent text-accent-foreground hover:bg-accent-dark',
        lumea:
          'border-transparent bg-[theme(colors.lumea.taupe.400)] text-primary-foreground hover:bg-[theme(colors.lumea.taupe.500)]',
        subtle: 'border-transparent bg-primary/10 text-primary hover:bg-primary/20',
        ghost: 'border-transparent bg-transparent text-foreground hover:bg-secondary/50',
        success:
          'border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        warning:
          'border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        info: 'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      },
      size: {
        default: 'h-6 px-2.5 py-0.5 text-xs',
        sm: 'h-5 px-2 py-0 text-[10px]',
        lg: 'h-7 px-3 py-1 text-sm',
      },
      rounded: {
        default: 'rounded-full',
        md: 'rounded-md',
        sm: 'rounded-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      rounded: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, rounded, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size, rounded }), className)} {...props} />;
}

export { Badge, badgeVariants };
