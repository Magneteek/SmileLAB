'use client';

/**
 * Toast Hook - ShadCN UI Toast Component
 *
 * This is a simplified toast notification system.
 * Uses a pub/sub pattern to sync state across components.
 */

import { useState, useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

// Module-level state
let toasts: Toast[] = [];
let listeners: Set<() => void> = new Set();

function notifyListeners() {
  console.log('🍞 Notifying', listeners.size, 'listeners, toasts:', toasts.length);
  listeners.forEach((listener) => listener());
}

function getSnapshot() {
  return toasts;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  console.log('🍞 Listener subscribed, total:', listeners.size);
  return () => {
    listeners.delete(callback);
    console.log('🍞 Listener unsubscribed, remaining:', listeners.size);
  };
}

function addToast(toast: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).substring(2, 11);
  const newToast: Toast = { ...toast, id };

  // Create new array to trigger re-render
  toasts = [...toasts, newToast];

  console.log('🍞 Toast ADDED:', { id, title: toast.title, variant: toast.variant, totalToasts: toasts.length });

  notifyListeners();

  // Auto-dismiss after specified duration (default 5 seconds)
  const duration = toast.duration ?? 5000;
  setTimeout(() => {
    dismissToast(id);
  }, duration);

  return id;
}

function dismissToast(toastId: string) {
  const before = toasts.length;
  toasts = toasts.filter((t) => t.id !== toastId);
  console.log('🍞 Toast DISMISSED:', toastId, 'before:', before, 'after:', toasts.length);
  notifyListeners();
}

export function useToast() {
  // useSyncExternalStore ensures proper synchronization with React
  const currentToasts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const toast = useCallback((props: Omit<Toast, 'id'>) => {
    return addToast(props);
  }, []);

  return {
    toast,
    toasts: currentToasts,
    dismiss: dismissToast,
  };
}
