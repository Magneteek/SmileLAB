/**
 * Responsive Table Wrapper
 * Provides horizontal scroll on mobile for tables
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveTableWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveTableWrapper({ children, className }: ResponsiveTableWrapperProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden rounded-lg">
          {children}
        </div>
      </div>
    </div>
  );
}
