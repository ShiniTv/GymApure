let appFontsLoaded = false;

/** Critical fonts for auth shell — loaded on startup. */
export function loadBaseFonts(): void {
  void import('@fontsource/inter/latin.css');
  void import('@fontsource/plus-jakarta-sans/latin-700.css');
  void import('@fontsource/plus-jakarta-sans/latin-800.css');
}

/** Mono + extra weights — deferred until authenticated app shell mounts. */
export function loadAppFonts(): void {
  if (appFontsLoaded) return;
  appFontsLoaded = true;
  void import('@fontsource/jetbrains-mono/latin.css');
}
