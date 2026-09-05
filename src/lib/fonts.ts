let appFontsLoaded = false;

/** Apple Operate uses the system UI stack — no webfont for chrome. */
export function loadBaseFonts(): void {
  // Intentionally empty: -apple-system / Segoe UI / system-ui from CSS.
}

/** Mono — deferred until authenticated app shell mounts (code / tabular screens). */
export function loadAppFonts(): void {
  if (appFontsLoaded) return;
  appFontsLoaded = true;
  void import('@fontsource/jetbrains-mono/latin.css');
}
