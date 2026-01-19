/**
 * Mobile Filter Drawer Component
 * Provides responsive filter UI - drawer on mobile, inline on desktop
 */

'use client';

import React from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface FilterDrawerProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  triggerLabel?: string;
}

export function FilterDrawer({
  children,
  title = 'Filters',
  description = 'Filter and search results',
  className,
  triggerLabel = 'Filters',
}: FilterDrawerProps) {
  return (
    <>
      {/* Mobile: Filter button + drawer */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Filter className="h-4 w-4 mr-2" />
              {triggerLabel}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px]">
            <SheetHeader>
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription>{description}</SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">{children}</div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Inline filters */}
      <div className={cn('hidden md:block', className)}>{children}</div>
    </>
  );
}
