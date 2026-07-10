import { useEffect } from 'react';
import { isAppearance, THEME_STORAGE_KEY } from '../../config/themes';
import { useTheme } from '../../context/ThemeContext';

/** First-time landing visitors see dark mode (premium layout) unless they already chose a theme. */
export function useLandingDarkDefault() {
  const { setTheme } = useTheme();

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (!isAppearance(stored)) {
        setTheme('dark');
      }
    } catch {
      setTheme('dark');
    }
  }, [setTheme]);
}
