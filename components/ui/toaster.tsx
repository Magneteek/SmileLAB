'use client';

/**
 * Toaster - Toast Container Component
 *
 * Renders toast notifications in a fixed position.
 */

import { useEffect } from 'react';
import { useToast } from './use-toast';
import { Toast, ToastTitle, ToastDescription } from './toast';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 md:max-w-[420px]">
      {toasts.map((toast) => (
        <Toast key={toast.id} variant={toast.variant}>
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
