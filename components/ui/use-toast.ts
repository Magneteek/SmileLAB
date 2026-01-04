'use client';

/**
 * Toast Hook - ShadCN UI Toast Component
 *
 * This is a simplified toast notification system.
 * For full functionality, install ShadCN UI toast component.
 */

import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
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

  listeners.forEach((listener) => listener(toastState));

  // Auto-dismiss after 3 seconds
  setTimeout(() => {
    dismiss(id);
  }, 3000);

  return id;
}

function dismiss(toastId: string) {
  toastState.toasts = toastState.toasts.filter((t) => t.id !== toastId);
  listeners.forEach((listener) => listener(toastState));
}

export function useToast() {
  const [state, setState] = useState<ToastState>(toastState);

  const subscribe = useCallback((listener: (state: ToastState) => void) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
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
