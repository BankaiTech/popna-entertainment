import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { supportedLanguages, setLanguage } from '@/i18n';
import { cn } from '@/lib/utils';

const labels: Record<string, string> = {
  en: 'English',
  ta: 'தமிழ்',
  hi: 'हिन्दी',
  te: 'తెలుగు',
  kn: 'ಕನ್ನಡ',
  ml: 'മലയാളം',
};

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current = supportedLanguages.find((l) => l.code === i18n.language) ?? supportedLanguages[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
          'border border-border bg-card hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1'
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select language"
      >
        <span className="min-w-[4rem] text-left">{labels[current.code] ?? current.label}</span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 mt-1 py-1 w-40 max-h-64 overflow-auto rounded-md border border-border bg-card shadow-lg z-[100]"
        >
          {supportedLanguages.map((lang) => (
            <li key={lang.code} role="option" aria-selected={i18n.language === lang.code}>
              <button
                type="button"
                onClick={() => {
                  setLanguage(lang.code);
                  setOpen(false);
                }}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm transition-colors',
                  i18n.language === lang.code ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                )}
              >
                {labels[lang.code] ?? lang.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
