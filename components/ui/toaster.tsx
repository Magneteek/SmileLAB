'use client';

/**
 * Toaster - Toast Container Component
 *
 * Renders toast notifications in a fixed position.
 */

import { useEffect, useState } from 'react';
import { useToast } from './use-toast';
import { Toast, ToastTitle, ToastDescription } from './toast';

export function Toaster() {
  const { toasts, dismiss } = useToast();
  const [mounted, setMounted] = useState(false);

  // Track mount state for debugging
  useEffect(() => {
    setMounted(true);
    console.log('🍞 Toaster MOUNTED');
    return () => {
      console.log('🍞 Toaster UNMOUNTED');
    };
  }, []);

  console.log('🍞 Toaster render, mounted:', mounted, 'toasts:', toasts.length, toasts);

  // Don't render on server
  if (!mounted) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex max-h-screen w-full flex-col-reverse gap-2 md:max-w-[420px]"
      style={{ pointerEvents: 'none' }}
    >
      {toasts.length === 0 && (
        <div className="hidden">No toasts</div>
      )}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          variant={toast.variant}
          onClose={() => dismiss(toast.id)}
          style={{ pointerEvents: 'auto' }}
        >
          <div className="grid gap-1">
            {toast.title && <ToastTitle>{toast.title}</ToastTitle>}
            {toast.description && (
              <ToastDescription>{toast.description}</ToastDescription>
            )}
          </div>
        </Toast>
      ))}
    </div>
  );
}
