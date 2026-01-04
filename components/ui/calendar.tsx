'use client';

/**
 * Calendar Component - ShadCN UI Calendar
 *
 * Simplified calendar component for date picking.
 * For full functionality, consider installing react-day-picker.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CalendarProps {
  mode?: 'single' | 'multiple' | 'range';
  selected?: Date | Date[] | { from: Date; to?: Date };
  onSelect?: (date: Date | Date[] | { from: Date; to?: Date } | undefined) => void;
  disabled?: (date: Date) => boolean;
  className?: string;
  initialFocus?: boolean;
}

export function Calendar({
  mode = 'single',
  selected,
  onSelect,
  disabled,
  className,
  ...props
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );

    if (disabled?.(clickedDate)) return;

    if (mode === 'single') {
      onSelect?.(clickedDate);
    }
  };

  const previousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );
  };

  const isSelected = (day: number) => {
    if (!selected) return false;
    if (mode === 'single' && selected instanceof Date) {
      const testDate = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day
      );
      return (
        testDate.getDate() === selected.getDate() &&
        testDate.getMonth() === selected.getMonth() &&
        testDate.getFullYear() === selected.getFullYear()
      );
    }
    return false;
  };

  return (
    <div className={cn('p-3', className)} {...props}>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={previousMonth}
          className="p-2 hover:bg-gray-100 rounded-md"
          type="button"
        >
          ←
        </button>
        <div className="font-semibold">
          {currentMonth.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })}
        </div>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 rounded-md"
          type="button"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-gray-500 p-2"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfMonth }).map((_, index) => (
          <div key={`empty-${index}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const date = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth(),
            day
          );
          const isDisabled = disabled?.(date);
          const selected = isSelected(day);

          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              disabled={isDisabled}
              type="button"
              className={cn(
                'p-2 text-sm rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed',
                selected && 'bg-gray-900 text-white hover:bg-gray-900'
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
