// Theme Provider - manages dark/light mode via the `dark` class on <html>.
//
// Rules:
// - The user's choice (light / dark / system) is saved in localStorage.
// - Every page follows that choice, the login pages too (they have their own dark design).
//   They used to be forced light, and '/customer/login/' (trailing slash) slipped through half-dark.
// - What is ON SCREEN and what the toggle/logo think is on screen must always match, so the
//   theme is re-applied on every route change (it used to be applied only when the choice changed,
//   which left the dashboard light after logging in from the always-light login page).
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

type Theme = 'light' | 'dark' | 'system';
type Resolved = 'light' | 'dark';

interface ThemeContextValue {
    theme: Theme;
    /** The theme actually shown on screen right now. */
    resolvedTheme: Resolved;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
    /** Internal: called by <ThemeRouteSync /> on navigation. */
    setPathname: (path: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: 'system',
    resolvedTheme: 'light',
    setTheme: () => { },
    toggleTheme: () => { },
    setPathname: () => { },
});

export const useTheme = () => useContext(ThemeContext);

function getSystemTheme(): Resolved {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(shown: Resolved) {
    const root = document.documentElement;
    root.classList.toggle('dark', shown === 'dark');
    root.style.colorScheme = shown;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
        meta.setAttribute('content', shown === 'dark' ? '#0f172a' : '#2563eb');
    }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
        if (typeof window === 'undefined') return 'system';
        try { return (localStorage.getItem('theme') as Theme) || 'system'; } catch { return 'system'; }
    });
    const [systemTheme, setSystemTheme] = useState<Resolved>(getSystemTheme);
    // Re-render on navigation so the theme is re-applied on every route (see the rules above).
    const [, setPathname] = useState<string>(
        () => (typeof window === 'undefined' ? '/' : window.location.pathname)
    );

    const preferred: Resolved = theme === 'system' ? systemTheme : theme;
    const resolvedTheme: Resolved = preferred;

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
        try {
            if (newTheme === 'system') localStorage.removeItem('theme');
            else localStorage.setItem('theme', newTheme);
        } catch { /* private mode: still applies for this visit */ }
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme(preferred === 'dark' ? 'light' : 'dark');
    }, [preferred, setTheme]);

    // Apply whenever what should be on screen changes (choice, OS setting, or route).
    useEffect(() => {
        applyTheme(resolvedTheme);
    }, [resolvedTheme]);

    // Follow the OS setting live (state update, so the toggle icon stays in sync too).
    useEffect(() => {
        const mql = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => setSystemTheme(mql.matches ? 'dark' : 'light');
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme, setPathname }}>
            {children}
        </ThemeContext.Provider>
    );
}

/** Render once inside <BrowserRouter> so the theme follows navigation. */
export function ThemeRouteSync() {
    const { pathname } = useLocation();
    const { setPathname } = useTheme();
    useEffect(() => {
        setPathname(pathname);
    }, [pathname, setPathname]);
    return null;
}
