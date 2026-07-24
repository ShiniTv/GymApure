let appFontsLoaded = false;

/** Critical fonts for auth shell — only weights used on first paint. */
export function loadBaseFonts(): void {
  void import('@fontsource/inter/latin-400.css');
  void import('@fontsource/inter/latin-500.css');
  void import('@fontsource/inter/latin-600.css');
  void import('@fontsource/inter/latin-700.css');
  void import('@fontsource/plus-jakarta-sans/latin-700.css');
  void import('@fontsource/plus-jakarta-sans/latin-800.css');
}

/** Mono + extra weights — deferred until authenticated app shell mounts. */
export function loadAppFonts(): void {
  if (appFontsLoaded) return;
  appFontsLoaded = true;
  void import('@fontsource/jetbrains-mono/latin.css');
}
