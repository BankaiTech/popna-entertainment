// Reusable Dialog for all modals — consistent overlay, sizing, and accessibility
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DialogSize = 'default' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

const sizeClasses: Record<DialogSize, string> = {
  default: 'w-full sm:max-w-md',
  sm: 'w-full sm:max-w-sm',
  md: 'w-full sm:max-w-lg',
  lg: 'w-full sm:max-w-2xl',
  xl: 'w-full sm:max-w-4xl',
  full: 'w-full max-w-[95vw] sm:max-w-4xl',
};

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: DialogSize;
  className?: string;
  /** Prevent close on overlay click (e.g. for forms with unsaved data) */
  closeOnOverlayClick?: boolean;
}

export function Dialog({
  open,
  onClose,
  children,
  size = 'default',
  className,
  closeOnOverlayClick = true,
}: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
      onClick={closeOnOverlayClick ? onClose : undefined}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'bg-card rounded-t-modal sm:rounded-modal shadow-soft-xl max-h-[90vh] overflow-hidden flex flex-col border border-border',
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

export interface DialogHeaderProps {
  title: React.ReactNode;
  onClose: () => void;
  className?: string;
}

export function DialogHeader({ title, onClose, className }: DialogHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between shrink-0 p-4 sm:p-6 border-b border-border', className)}>
      <h2 className="text-lg sm:text-xl font-bold text-foreground">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        className="p-2 hover:bg-accent rounded-lg transition-colors"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

export interface DialogBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogBody({ children, className }: DialogBodyProps) {
  return (
    <div className={cn('flex-1 min-h-0 overflow-y-auto', className)}>
      {children}
    </div>
  );
}

export interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogFooter({ children, className }: DialogFooterProps) {
  return (
    <div className={cn('shrink-0 flex flex-wrap justify-end gap-3 p-4 sm:p-6 border-t border-border bg-muted/30', className)}>
      {children}
    </div>
  );
}
