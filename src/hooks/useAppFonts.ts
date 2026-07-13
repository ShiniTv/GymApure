import { useEffect } from 'react';
import { loadAppFonts } from '../lib/fonts';

export function useAppFonts(): void {
  useEffect(() => {
    loadAppFonts();
  }, []);
}
