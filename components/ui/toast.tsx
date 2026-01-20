'use client';

/**
 * Toast Component - ShadCN UI Toast
 *
 * Simplified toast notification component with animations.
 */

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive';
  onClose?: () => void;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant = 'default', onClose, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="alert"
        aria-live="assertive"
        className={cn(
          'pointer-events-auto relative flex w-full items-center space-x-4 overflow-hidden rounded-md border p-4 pr-10 shadow-lg transition-all duration-300',
          variant === 'default' && 'border-gray-200 bg-white text-gray-900',
          variant === 'destructive' && 'border-red-500 bg-red-600 text-white',
          className
        )}
        style={{
          animation: 'slideInUp 0.3s ease-out forwards',
        }}
        {...props}
      >
        {children}
        {onClose && (
          <button
            onClick={onClose}
            className={cn(
              'absolute right-2 top-2 rounded-md p-1 opacity-70 hover:opacity-100 transition-opacity',
              variant === 'destructive' ? 'text-white hover:bg-red-700' : 'text-gray-500 hover:bg-gray-100'
            )}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
Toast.displayName = 'Toast';

const ToastTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm font-semibold', className)}
    {...props}
  />
));
ToastTitle.displayName = 'ToastTitle';

const ToastDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm opacity-90', className)}
    {...props}
  />
));
ToastDescription.displayName = 'ToastDescription';

const ToastAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      'inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
      className
    )}
    {...props}
  />
));
ToastAction.displayName = 'ToastAction';

// Type for ToastAction element used in toast system
type ToastActionElement = React.ReactElement<typeof ToastAction>;

export { Toast, ToastTitle, ToastDescription, ToastAction };
export type { ToastActionElement };
