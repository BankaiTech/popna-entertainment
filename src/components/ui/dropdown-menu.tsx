// Global select dropdown rendered using portal to prevent clipping
// Global select dropdown and mobile UI fully fixed
import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

type Align = 'start' | 'center' | 'end';

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  disabled: boolean;
  triggerRef: React.RefObject<HTMLDivElement>;
  contentRef: React.RefObject<HTMLDivElement>;
  position: { top: number; left: number; width: number };
  updatePosition: () => void;
  align: Align;
}

const Ctx = createContext<DropdownMenuContextValue | null>(null);
function useCtx() {
  const c = useContext(Ctx);
  if (!c) throw new Error('DropdownMenu context missing');
  return c;
}

const EDGE_MARGIN = 8;

interface DropdownMenuProps {
  children: React.ReactNode;
  side?: 'bottom' | 'top';
  align?: Align;
  disabled?: boolean;
}

export function DropdownMenu({ children, side = 'bottom', align = 'end', disabled = false }: DropdownMenuProps) {
  const [open, setOpenRaw] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  const contentRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  const setOpen = useCallback((v: boolean) => {
    if (disabled && v) return;
    setOpenRaw(v);
  }, [disabled]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const content = contentRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const contentH = content?.offsetHeight ?? 0;
    const contentW = content?.offsetWidth ?? rect.width;
    const triggerW = rect.width;
    const menuW = Math.max(contentW, triggerW);
    const gap = 4;
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    // Auto-flip: prefer bottom, flip to top if not enough space below
    const spaceBelow = vh - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    let top: number;
    if (side === 'bottom' && spaceBelow >= contentH) {
      top = rect.bottom + gap;
    } else if (side === 'bottom' && spaceAbove >= contentH) {
      top = rect.top - contentH - gap;
    } else if (side === 'top' && spaceAbove >= contentH) {
      top = rect.top - contentH - gap;
    } else {
      top = rect.bottom + gap;
    }

    // Horizontal alignment
    let left: number;
    if (align === 'end') left = rect.right - menuW;
    else if (align === 'center') left = rect.left + (rect.width - menuW) / 2;
    else left = rect.left;

    // Clamp to viewport edges
    if (left + menuW > vw - EDGE_MARGIN) left = vw - menuW - EDGE_MARGIN;
    if (left < EDGE_MARGIN) left = EDGE_MARGIN;
    if (top + contentH > vh - EDGE_MARGIN) top = vh - contentH - EDGE_MARGIN;
    if (top < EDGE_MARGIN) top = EDGE_MARGIN;

    setPosition({ top, left, width: triggerW });
  }, [side, align]);

  // Reposition after open + after content mounts
  useEffect(() => {
    if (!open) return;
    // Run twice: once immediately (content might not be painted yet), once after a frame
    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(raf);
  }, [open, updatePosition]);

  // Scroll / resize tracking
  useEffect(() => {
    if (!open) return;
    const handler = () => updatePosition();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [open, updatePosition]);

  // Click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const el = e.target as Node;
      if (triggerRef.current?.contains(el) || contentRef.current?.contains(el)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, setOpen]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, setOpen]);

  return (
    <Ctx.Provider value={{ open, setOpen, disabled, triggerRef, contentRef, position, updatePosition, align }}>
      {children}
    </Ctx.Provider>
  );
}

export function DropdownMenuTrigger({
  children, className, ...rest
}: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  const { open, setOpen, disabled, triggerRef } = useCtx();
  return (
    <div
      ref={triggerRef}
      onClick={() => { if (!disabled) setOpen(!open); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!disabled) setOpen(!open); } }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      className={cn('cursor-pointer outline-none', disabled && 'cursor-not-allowed opacity-50', className)}
      aria-expanded={open}
      aria-haspopup="listbox"
      {...rest}
    >
      {children}
    </div>
  );
}

export function DropdownMenuContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const { open, contentRef, position } = useCtx();
  if (!open) return null;

  const el = (
    <div
      ref={contentRef}
      role="listbox"
      className={cn(
        'fixed z-[9999] rounded-lg border border-border bg-background shadow-lg py-1',
        'max-h-[250px] overflow-y-auto overscroll-contain',
        '-webkit-overflow-scrolling-touch',
        className
      )}
      style={{
        top: position.top,
        left: position.left,
        minWidth: position.width,
      }}
      onTouchMove={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
  return createPortal(el, document.body);
}

export function DropdownMenuItem({
  children, className, onSelect, disabled,
}: { children: React.ReactNode; className?: string; onSelect?: () => void; disabled?: boolean }) {
  const { setOpen } = useCtx();
  const handleClick = () => {
    if (disabled) return;
    onSelect?.();
    setOpen(false);
  };
  return (
    <div
      role="option"
      className={cn(
        'flex cursor-pointer select-none items-center px-3 py-2.5 text-sm outline-none transition-colors',
        'hover:bg-muted focus:bg-muted active:bg-muted/80',
        'touch-manipulation',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleClick(); } }}
      tabIndex={disabled ? -1 : 0}
    >
      {children}
    </div>
  );
}
