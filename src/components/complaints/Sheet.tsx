// A dialog that is a bottom sheet on phones (easy to reach with a thumb) and a centred card on desktop.
import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLt } from '@/lib/lt';

export function Sheet({
  title, subtitle, onClose, children, footer, wide = false, dismissable = true,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  /** false: tapping outside does not close (forms with typed text). Esc and ✕ still close. */
  dismissable?: boolean;
}) {
  const tr = useLt();
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const prevFocus = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div role="presentation" onClick={dismissable ? onClose : undefined}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-[2px] sm:p-4">
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} max-h-[92dvh] sm:max-h-[88vh] flex flex-col outline-none
          bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-2xl
          rounded-t-2xl sm:rounded-2xl border border-gray-200/70 dark:border-gray-700/70 animate-scale-in`}>
        <div className="sm:hidden mx-auto mt-2 h-1.5 w-10 rounded-full bg-gray-300 dark:bg-gray-700" aria-hidden />
        <div className="flex items-start gap-3 px-5 pt-3 sm:pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base sm:text-lg font-semibold leading-snug break-words">{title}</h2>
            {subtitle && <div className="mt-0.5 text-sm text-gray-500 dark:text-gray-400 break-words">{subtitle}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label={tr('Close')}
            className="-mr-2 -mt-1 p-2.5 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && (
          <div className="shrink-0 grid grid-cols-2 [&>*:only-child]:col-span-2 sm:flex sm:justify-end gap-2 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 sm:rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Full-width buttons on phones, right-aligned on desktop. */
export function SheetButton({
  children, onClick, disabled, kind = 'primary', type = 'button', main = false,
}: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
  kind?: 'primary' | 'secondary' | 'success' | 'danger'; type?: 'button' | 'submit';
  /** With three buttons: on phones this one gets its own full-width row on top. */
  main?: boolean;
}) {
  const styles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    secondary: 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700',
  }[kind];
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${main ? 'col-span-2 order-first sm:order-none' : ''} min-w-0 sm:flex-none inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-xl text-sm font-semibold text-center leading-tight disabled:opacity-50 disabled:cursor-not-allowed ${styles}`}>
      {children}
    </button>
  );
}
