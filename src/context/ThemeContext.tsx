import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  applyThemeToDocument,
  getStoredPalette,
  getStoredTheme,
  persistTheme,
  type Appearance,
  type PaletteId,
} from '../config/themes';

interface ThemeContextType {
  theme: Appearance;
  palette: PaletteId;
  toggleTheme: () => void;
  setTheme: (theme: Appearance) => void;
  setPalette: (palette: PaletteId) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Appearance>(() => getStoredTheme());

  const [palette, setPaletteState] = useState<PaletteId>(() => getStoredPalette());

  useEffect(() => {
    applyThemeToDocument(theme, palette);
    persistTheme(theme, palette);
  }, [theme, palette]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setThemeExplicit = (next: Appearance) => {
    setTheme(next);
  };

  const setPalette = (next: PaletteId) => {
    setPaletteState(next);
  };

  return (
    <ThemeContext.Provider
      value={{ theme, palette, toggleTheme, setTheme: setThemeExplicit, setPalette }}
    >
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
