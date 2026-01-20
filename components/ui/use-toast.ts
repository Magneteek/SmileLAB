'use client';

/**
 * Toast Hook - ShadCN UI Toast Component
 *
 * This is a simplified toast notification system.
 * For full functionality, install ShadCN UI toast component.
 */

import { useState, useCallback, useEffect } from 'react';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
}

const toastState: ToastState = {
  toasts: [],
};

let listeners: Array<(state: ToastState) => void> = [];

function dispatch(toast: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).substr(2, 9);
  toastState.toasts = [...toastState.toasts, { ...toast, id }];

  // Pass a NEW object reference to trigger React re-render
  listeners.forEach((listener) => listener({ ...toastState }));

  // Auto-dismiss after specified duration (default 3 seconds)
  const duration = toast.duration || 3000;
  setTimeout(() => {
    dismiss(id);
  }, duration);

  return id;
}

function dismiss(toastId: string) {
  toastState.toasts = toastState.toasts.filter((t) => t.id !== toastId);
  // Pass a NEW object reference to trigger React re-render
  listeners.forEach((listener) => listener({ ...toastState }));
}

export function useToast() {
  const [state, setState] = useState<ToastState>(toastState);

  // Subscribe to state changes on mount
  useEffect(() => {
    listeners.push(setState);
    return () => {
      listeners = listeners.filter((l) => l !== setState);
    };
  }, []);

  const toast = useCallback(
    (props: Omit<Toast, 'id'>) => {
      return dispatch(props);
    },
    []
  );

  return {
    toast,
    toasts: state.toasts,
    dismiss,
  };
}
