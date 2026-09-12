import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  applyThemeToDocument,
  getStoredAuthBgEffect,
  getStoredPalette,
  getStoredTheme,
  persistTheme,
  type Appearance,
  type AuthBgEffect,
  type PaletteId,
} from '../config/themes';

interface ThemeContextType {
  theme: Appearance;
  palette: PaletteId;
  authBgEffect: AuthBgEffect;
  toggleTheme: () => void;
  setTheme: (theme: Appearance) => void;
  setPalette: (palette: PaletteId) => void;
  setAuthBgEffect: (effect: AuthBgEffect) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Appearance>(() => getStoredTheme());
  const [palette, setPaletteState] = useState<PaletteId>(() => getStoredPalette());
  const [authBgEffect, setAuthBgEffectState] = useState<AuthBgEffect>(() =>
    getStoredAuthBgEffect()
  );

  useEffect(() => {
    applyThemeToDocument(theme, palette);
    persistTheme(theme, palette, authBgEffect);
  }, [theme, palette, authBgEffect]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setThemeExplicit = (next: Appearance) => {
    setTheme(next);
  };

  const setPalette = (next: PaletteId) => {
    setPaletteState(next);
  };

  const setAuthBgEffect = (next: AuthBgEffect) => {
    setAuthBgEffectState(next);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        palette,
        authBgEffect,
        toggleTheme,
        setTheme: setThemeExplicit,
        setPalette,
        setAuthBgEffect,
      }}
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
