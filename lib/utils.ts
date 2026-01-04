import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date to European standard (dd.mm.yyyy)
 * @param date - Date object or string
 * @param locale - Locale string (default: 'sl-SI' for European format)
 * @returns Formatted date string (dd.mm.yyyy)
 */
export function formatDate(date: Date | string, locale: string = 'sl-SI'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return dateObj.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
