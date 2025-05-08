import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  'rounded-lg border bg-card text-card-foreground transition-all duration-300',
  {
    variants: {
      variant: {
        default: 'border-border shadow-lumea-sm',
        elevated: 'border-border shadow-lumea-md hover:shadow-lumea-lg',
        outline:
          'border-[theme(colors.lumea.taupe.300)] border-2 dark:border-[theme(colors.lumea.stone.600/50)]',
        lumea: 'lumea-card',
        glass:
          'bg-white/70 dark:bg-[theme(colors.lumea.stone.700/10)] backdrop-blur-sm border-[theme(colors.lumea.bone.DEFAULT)] dark:border-[theme(colors.lumea.stone.600/20)] shadow-lumea-sm',
        feature:
          'border-[theme(colors.lumea.sage.300)] dark:border-[theme(colors.lumea.sage.700)] shadow-[0_0_0_1px_theme(colors.lumea.sage.200)] dark:shadow-[0_0_0_1px_theme(colors.lumea.sage.800/30)] shadow-lumea-sm hover:shadow-lumea-md',
      },
      size: {
        default: 'p-6',
        sm: 'p-4',
        lg: 'p-8',
        none: 'p-0',
      },
      radius: {
        default: 'rounded-lg',
        sm: 'rounded-md',
        lg: 'rounded-xl',
        xl: 'rounded-2xl',
        full: 'rounded-3xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      radius: 'default',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, radius, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant, size, radius, className }))} {...props} />
  )
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-2xl font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
