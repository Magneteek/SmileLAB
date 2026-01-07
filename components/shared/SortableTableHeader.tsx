'use client';

/**
 * Sortable Table Header Component
 *
 * Reusable component for sortable table column headers
 */

import { TableHead } from '@/components/ui/table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SortDirection = 'asc' | 'desc' | null;

interface SortableTableHeaderProps {
  children: React.ReactNode;
  sortKey: string;
  currentSortKey: string | null;
  currentSortDirection: SortDirection;
  onSort: (key: string) => void;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export function SortableTableHeader({
  children,
  sortKey,
  currentSortKey,
  currentSortDirection,
  onSort,
  className,
  align = 'left',
}: SortableTableHeaderProps) {
  const isActive = currentSortKey === sortKey;
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : '';

  return (
    <TableHead className={cn(alignClass, className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'flex items-center gap-1 font-medium transition-colors hover:text-foreground',
          isActive ? 'text-foreground' : 'text-muted-foreground',
          align === 'right' && 'justify-end',
          align === 'center' && 'justify-center'
        )}
      >
        {children}
        {isActive && currentSortDirection === 'asc' && (
          <ArrowUp className="h-4 w-4" />
        )}
        {isActive && currentSortDirection === 'desc' && (
          <ArrowDown className="h-4 w-4" />
        )}
        {!isActive && <ArrowUpDown className="h-4 w-4 opacity-40" />}
      </button>
    </TableHead>
  );
}
