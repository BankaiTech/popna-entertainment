// Logo - auto-switches between light/dark and full/icon variants
import { useTheme } from './ThemeProvider';

interface LogoProps {
    className?: string;
    alt?: string;
    /** 'full' = icon + text, 'icon' = icon only */
    variant?: 'full' | 'icon';
}

export default function Logo({ className = '', alt = 'Popna', variant = 'full' }: LogoProps) {
    const { resolvedTheme } = useTheme();

    if (variant === 'icon') {
        return <img src="/Popna Logo.png" alt={alt} className={className} />;
    }

    const src = resolvedTheme === 'dark' ? '/Popna Dark.png' : '/Popna.png';
    return <img src={src} alt={alt} className={className} />;
}
