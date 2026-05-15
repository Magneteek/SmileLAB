'use client';

/**
 * Popover Component
 *
 * Uses createPortal + position:fixed so it is never clipped by
 * overflow:hidden / overflow:auto scroll containers.
 */

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

// ============================================================================
// CONTEXT
// ============================================================================

interface PopoverContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
}

const PopoverContext = React.createContext<PopoverContextValue>({
  open: false,
  onOpenChange: () => {},
  triggerRef: { current: null },
});

// ============================================================================
// POPOVER ROOT
// ============================================================================

export interface PopoverProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Popover({ open: controlledOpen, onOpenChange, children }: PopoverProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (!isControlled) setInternalOpen(newOpen);
      onOpenChange?.(newOpen);
    },
    [isControlled, onOpenChange]
  );

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        contentRef.current?.contains(target)
      ) {
        return;
      }
      handleOpenChange(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, handleOpenChange]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleOpenChange(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, handleOpenChange]);

  return (
    <PopoverContext.Provider value={{ open, onOpenChange: handleOpenChange, triggerRef }}>
      <PopoverContentRefContext.Provider value={contentRef}>
        {children}
      </PopoverContentRefContext.Provider>
    </PopoverContext.Provider>
  );
}

const PopoverContentRefContext = React.createContext<React.MutableRefObject<HTMLDivElement | null>>({
  current: null,
});

// ============================================================================
// POPOVER TRIGGER
// ============================================================================

export interface PopoverTriggerProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean;
  children: React.ReactNode;
}

export const PopoverTrigger = React.forwardRef<HTMLElement, PopoverTriggerProps>(
  ({ children, asChild, ...props }, forwardedRef) => {
    const { open, onOpenChange, triggerRef } = React.useContext(PopoverContext);

    const setRef = (el: HTMLElement | null) => {
      triggerRef.current = el;
      if (typeof forwardedRef === 'function') forwardedRef(el as any);
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLElement | null>).current = el;
    };

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onOpenChange(!open);
    };

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<any>;
      return React.cloneElement(child, {
        ...child.props,
        ref: setRef,
        onClick: (e: React.MouseEvent) => {
          handleClick(e);
          child.props.onClick?.(e);
        },
      });
    }

    return (
      <button
        ref={setRef as React.Ref<HTMLButtonElement>}
        type="button"
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    );
  }
);
PopoverTrigger.displayName = 'PopoverTrigger';

// ============================================================================
// POPOVER CONTENT
// ============================================================================

export interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom';
  sideOffset?: number;
}

export const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  (
    {
      className,
      align = 'center',
      side = 'bottom',
      sideOffset = 4,
      style,
      children,
      ...props
    },
    forwardedRef
  ) => {
    const { open, triggerRef } = React.useContext(PopoverContext);
    const contentRefFromCtx = React.useContext(PopoverContentRefContext);
    const [mounted, setMounted] = React.useState(false);
    const [position, setPosition] = React.useState<React.CSSProperties>({});

    // Ensure portal target exists (SSR guard)
    React.useEffect(() => {
      setMounted(true);
    }, []);

    // Compute position whenever open or alignment changes
    React.useLayoutEffect(() => {
      if (!open || !triggerRef.current || !mounted) return;

      const rect = triggerRef.current.getBoundingClientRect();
      const newStyle: React.CSSProperties = {
        position: 'fixed',
        zIndex: 9999,
      };

      // Vertical
      if (side === 'bottom') {
        newStyle.top = rect.bottom + sideOffset;
      } else {
        newStyle.bottom = window.innerHeight - rect.top + sideOffset;
      }

      // Horizontal
      if (align === 'start') {
        newStyle.left = rect.left;
      } else if (align === 'end') {
        newStyle.right = window.innerWidth - rect.right;
      } else {
        newStyle.left = rect.left + rect.width / 2;
        newStyle.transform = 'translateX(-50%)';
      }

      setPosition(newStyle);
    }, [open, align, side, sideOffset, mounted, triggerRef]);

    if (!open || !mounted) return null;

    const setRef = (el: HTMLDivElement | null) => {
      contentRefFromCtx.current = el;
      if (typeof forwardedRef === 'function') forwardedRef(el);
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    };

    return createPortal(
      <div
        ref={setRef}
        className={cn(
          'rounded-md border border-gray-200 bg-white text-gray-950 shadow-md outline-none',
          className
        )}
        style={{ ...position, ...style }}
        {...props}
      >
        {children}
      </div>,
      document.body
    );
  }
);
PopoverContent.displayName = 'PopoverContent';
