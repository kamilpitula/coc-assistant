import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/shared/components/utils'

const alertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-3.5 [&>svg]:size-4 [&>svg~*]:pl-7',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive: 'border-destructive text-destructive',
        warning: 'border-warning text-warning',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

/** A boxed message. It has no implicit role; callers add role="alert" or role="status" only when announcing. */
const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} className={cn(alertVariants({ variant }), className)} {...props} />
))
Alert.displayName = 'Alert'

/** The Alert's heading; `level` keeps the document outline correct where the Alert is placed. */
const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & { level?: 2 | 3 }
>(({ className, level = 2, ...props }, ref) => {
  const Heading = level === 2 ? 'h2' : 'h3'
  return <Heading ref={ref} className={cn('mb-1 font-medium leading-none', className)} {...props} />
})
AlertTitle.displayName = 'AlertTitle'

const AlertDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />,
)
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertDescription, AlertTitle }
