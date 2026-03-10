// Theme Switcher - toggle button for dark/light mode
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useTranslation } from 'react-i18next';

export default function ThemeSwitcher() {
    const { resolvedTheme, toggleTheme } = useTheme();
    const { t } = useTranslation();

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
            title={resolvedTheme === 'dark' ? t('theme.light', 'Switch to light mode') : t('theme.dark', 'Switch to dark mode')}
            aria-label={resolvedTheme === 'dark' ? t('theme.light', 'Switch to light mode') : t('theme.dark', 'Switch to dark mode')}
        >
            {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
    );
}
