// Select dropdown rendered using portal to prevent clipping
import { useTranslation } from 'react-i18next';
import { ChevronDown, Check } from 'lucide-react';
import { supportedLanguages, setLanguage } from '@/i18n';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

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
  const current = supportedLanguages.find((l) => l.code === i18n.language) ?? supportedLanguages[0];

  return (
    <DropdownMenu side="bottom" align="end">
      <DropdownMenuTrigger
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
          'border border-border bg-card hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1'
        )}
        aria-label="Select language"
      >
        <span className="min-w-[4rem] text-left">{labels[current.code] ?? current.label}</span>
        <ChevronDown className="w-4 h-4 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[10rem]">
        {supportedLanguages.map((lang) => {
          const isActive = i18n.language === lang.code;
          return (
            <DropdownMenuItem
              key={lang.code}
              onSelect={() => setLanguage(lang.code)}
              className={cn(
                isActive && 'bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary/90 active:bg-primary/80'
              )}
            >
              <span className="flex-1">{labels[lang.code] ?? lang.label}</span>
              {isActive && <Check className="h-4 w-4 shrink-0 ml-2" aria-hidden />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
