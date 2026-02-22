import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type Side = 'top' | 'right' | 'bottom' | 'left';
type Align = 'start' | 'center' | 'end';

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  disabled: boolean;
  triggerRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  position: { top: number; left: number };
  setPosition: (p: { top: number; left: number }) => void;
  updatePosition: () => void;
  side: Side;
  align: Align;
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenu() {
  const ctx = useContext(DropdownMenuContext);
  if (!ctx) throw new Error('Dropdown components must be used within DropdownMenu');
  return ctx;
}

interface DropdownMenuProps {
  children: React.ReactNode;
  side?: Side;
  align?: Align;
  disabled?: boolean;
}

export function DropdownMenu({ children, side = 'bottom', align = 'end', disabled = false }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const gap = 2;
    const contentWidth = contentRef.current?.getBoundingClientRect().width ?? rect.width;
    const contentHeight = contentRef.current?.getBoundingClientRect().height ?? 0;
    let top = 0;
    let left = 0;
    if (side === 'bottom') {
      top = rect.bottom + gap;
      if (align === 'end') left = rect.right - contentWidth;
      else if (align === 'center') left = rect.left + (rect.width - contentWidth) / 2;
      else left = rect.left;
    } else if (side === 'top') {
      top = rect.top - contentHeight - gap;
      if (align === 'end') left = rect.right - contentWidth;
      else if (align === 'center') left = rect.left + (rect.width - contentWidth) / 2;
      else left = rect.left;
    } else {
      top = rect.top;
      left = align === 'end' ? rect.right - contentWidth : rect.left;
    }
    setPosition({ top, left });
  }, [side, align]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const el = e.target as Node;
      if (triggerRef.current?.contains(el) || contentRef.current?.contains(el)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <DropdownMenuContext.Provider
      value={{
        open,
        setOpen,
        disabled,
        triggerRef,
        contentRef,
        position,
        setPosition,
        updatePosition,
        side,
        align,
      }}
    >
      {children}
    </DropdownMenuContext.Provider>
  );
}

export function DropdownMenuTrigger({
  children,
  className,
  asChild,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  const { open, setOpen, disabled, triggerRef } = useDropdownMenu();
  const handleClick = () => {
    if (disabled) return;
    setOpen(!open);
  };
  return (
    <div
      ref={triggerRef}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), setOpen(!open))}
      role="button"
      tabIndex={0}
      className={cn(asChild ? '' : 'cursor-pointer outline-none', className)}
      aria-expanded={open}
      aria-haspopup="true"
      {...rest}
    >
      {children}
    </div>
  );
}

export function DropdownMenuContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { open, contentRef, position, updatePosition } = useDropdownMenu();

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => {
        updatePosition();
      });
      return () => cancelAnimationFrame(id);
    }
  }, [open, updatePosition]);

  if (!open) return null;

  const el = (
    <div
      ref={contentRef}
      role="menu"
      className={cn(
        'fixed z-[9999] rounded-lg border border-border bg-background shadow-lg py-1 min-w-[8rem] max-h-[var(--radix-dropdown-menu-content-available-height,20rem)] overflow-auto',
        className
      )}
      style={{ top: position.top, left: position.left }}
    >
      {children}
    </div>
  );
  return typeof document !== 'undefined' ? createPortal(el, document.body) : null;
}

export function DropdownMenuItem({
  children,
  className,
  onSelect,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  onSelect?: () => void;
  disabled?: boolean;
}) {
  const { setOpen } = useDropdownMenu();
  const handleClick = () => {
    if (disabled) return;
    onSelect?.();
    setOpen(false);
  };
  return (
    <div
      role="menuitem"
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-colors hover:bg-muted focus:bg-muted',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleClick())}
      tabIndex={disabled ? -1 : 0}
    >
      {children}
    </div>
  );
}
