// LCO Desk logo: the app icon (same as the browser tab icon) + the name as text.
import { cn } from '@/lib/utils';

interface LogoProps {
    className?: string;
    alt?: string;
    /** 'full' = icon + name, 'icon' = icon only */
    variant?: 'full' | 'icon';
    /** 'auto' follows light/dark mode; 'light' = white text for dark backgrounds */
    tone?: 'auto' | 'light';
    size?: 'sm' | 'md' | 'lg';
}

const ICON = '/lcodesk-icon.png';
const SIZES = {
    sm: { img: 'h-7 w-7', text: 'text-lg' },
    md: { img: 'h-9 w-9', text: 'text-xl' },
    lg: { img: 'h-12 w-12', text: 'text-3xl' },
};

export default function Logo({ className = '', alt = 'LCO Desk', variant = 'full', tone = 'auto', size = 'md' }: LogoProps) {
    if (variant === 'icon') {
        return <img src={ICON} alt={alt} className={cn(SIZES[size].img, 'object-contain', className)} />;
    }
    return (
        <span className={cn('inline-flex items-center gap-2 select-none', className)} role="img" aria-label={alt}>
            <img src={ICON} alt="" className={cn(SIZES[size].img, 'object-contain shrink-0')} />
            <span
                className={cn(
                    'font-bold tracking-tight whitespace-nowrap',
                    SIZES[size].text,
                    tone === 'light' ? 'text-white' : 'text-gray-900 dark:text-white',
                )}
            >
                LCO Desk
            </span>
        </span>
    );
}
