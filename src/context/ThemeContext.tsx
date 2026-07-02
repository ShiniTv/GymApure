import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  applyThemeToDocument,
  DEFAULT_PALETTE,
  getSystemAppearance,
  isAppearance,
  isPaletteId,
  PALETTE_STORAGE_KEY,
  type Appearance,
  type PaletteId,
  THEME_STORAGE_KEY,
} from '../config/themes';

interface ThemeContextType {
  theme: Appearance;
  palette: PaletteId;
  toggleTheme: () => void;
  setPalette: (palette: PaletteId) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Appearance>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return isAppearance(saved) ? saved : getSystemAppearance();
  });

  const [palette, setPaletteState] = useState<PaletteId>(() => {
    const saved = localStorage.getItem(PALETTE_STORAGE_KEY);
    return isPaletteId(saved) ? saved : DEFAULT_PALETTE;
  });

  useEffect(() => {
    applyThemeToDocument(theme, palette);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    localStorage.setItem(PALETTE_STORAGE_KEY, palette);
  }, [theme, palette]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setPalette = (next: PaletteId) => {
    setPaletteState(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, palette, toggleTheme, setPalette }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
