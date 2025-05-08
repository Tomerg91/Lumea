import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground border-border',
        destructive:
          'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive bg-destructive/10',
        success:
          'border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 bg-green-50 dark:bg-green-900/30 [&>svg]:text-green-600 dark:[&>svg]:text-green-400',
        warning:
          'border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/30 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-400',
        info: 'border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400',
        accent:
          'border-accent/30 text-accent-foreground dark:text-accent-foreground bg-accent/10 [&>svg]:text-accent',
        lumea:
          'border-[theme(colors.lumea.sage.300)] dark:border-[theme(colors.lumea.sage.700)] text-[theme(colors.lumea.stone.700)] dark:text-[theme(colors.lumea.beige.200)] bg-[theme(colors.lumea.sage.50)] dark:bg-[theme(colors.lumea.sage.900/20)] [&>svg]:text-[theme(colors.lumea.sage.600)] dark:[&>svg]:text-[theme(colors.lumea.sage.400)]',
      },
      size: {
        default: 'p-4',
        sm: 'p-3 text-sm',
        lg: 'p-5',
      },
      rounded: {
        default: 'rounded-lg',
        sm: 'rounded-md',
        lg: 'rounded-xl',
        none: 'rounded-none',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      rounded: 'default',
    },
  }
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, size, rounded, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant, size, rounded }), className)}
      {...props}
    />
  )
);
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn('mb-1 font-medium leading-none tracking-tight', className)}
      {...props}
    />
  )
);
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription, alertVariants };
