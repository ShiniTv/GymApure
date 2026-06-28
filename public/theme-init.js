(function () {
  var PALETTES = {
    monochrome: {
      light: { b: '#18181b', bh: '#27272a', c: '#18181b' },
      dark: { b: '#fafafa', bh: '#e4e4e7', c: '#fafafa' },
    },
    ember: {
      light: { b: '#f97316', bh: '#ea580c', c: '#f97316' },
      dark: { b: '#f97316', bh: '#fb923c', c: '#f97316' },
    },
    ocean: {
      light: { b: '#0891b2', bh: '#0e7490', c: '#0891b2' },
      dark: { b: '#22d3ee', bh: '#67e8f9', c: '#22d3ee' },
    },
    forest: {
      light: { b: '#059669', bh: '#047857', c: '#059669' },
      dark: { b: '#34d399', bh: '#6ee7b7', c: '#34d399' },
    },
    indigo: {
      light: { b: '#4f46e5', bh: '#4338ca', c: '#4f46e5' },
      dark: { b: '#818cf8', bh: '#a5b4fc', c: '#818cf8' },
    },
    rose: {
      light: { b: '#e11d48', bh: '#be123c', c: '#e11d48' },
      dark: { b: '#fb7185', bh: '#fda4af', c: '#fb7185' },
    },
    slate: {
      light: { b: '#475569', bh: '#334155', c: '#475569' },
      dark: { b: '#94a3b8', bh: '#cbd5e1', c: '#94a3b8' },
    },
    gold: {
      light: { b: '#b45309', bh: '#92400e', c: '#b45309' },
      dark: { b: '#fbbf24', bh: '#fde047', c: '#fbbf24' },
    },
  };

  var theme = localStorage.getItem('theme') === 'light' ? 'light' : 'dark';
  var palette = localStorage.getItem('gymapure-palette');
  if (!PALETTES[palette]) palette = 'monochrome';

  var root = document.documentElement;
  root.classList.add(theme);
  root.dataset.palette = palette;

  var vars = PALETTES[palette][theme];
  root.style.setProperty('--color-brand', vars.b);
  root.style.setProperty('--color-brand-hover', vars.bh);
  root.style.setProperty('--chart-accent', vars.c);
})();
