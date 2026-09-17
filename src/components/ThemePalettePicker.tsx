import { Check } from 'lucide-react';
import { DEFAULT_PALETTE, FEATURED_PALETTE_LIST } from '../config/themes';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

export default function ThemePalettePicker() {
  const { palette, setPalette } = useTheme();

  return (
    <div className="space-y-2.5">
      <div
        role="radiogroup"
        aria-label="Paleta de colores"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {FEATURED_PALETTE_LIST.map((item) => {
          const isActive = palette === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setPalette(item.id)}
              className={cn(
                'relative flex touch-manipulation items-center gap-2.5 rounded-xl border p-2.5 text-left transition-[background-color,border-color,color,box-shadow,opacity] duration-150 [transition-timing-function:var(--ease-out)]',
                'focus-visible:ring-brand/50 focus:outline-none focus-visible:ring-2',
                isActive
                  ? 'border-brand bg-brand/5 shadow-2xs'
                  : 'border-border bg-surface can-hover:hover:border-border/80'
              )}
            >
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-black/10 shadow-xs"
                style={{
                  background: `linear-gradient(135deg, ${item.swatch.light} 50%, ${item.swatch.dark} 50%)`,
                }}
              >
                {isActive && (
                  <Check
                    className="h-3.5 w-3.5 text-white drop-shadow-sm"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-text truncate text-xs font-semibold">{item.label}</p>
                <p className="text-text-muted text-small truncate">
                  {item.id === 'sky' ? 'Predeterminado' : 'Acento'}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {palette !== DEFAULT_PALETTE && (
        <button
          type="button"
          onClick={() => setPalette(DEFAULT_PALETTE)}
          className="hover:text-brand text-text-muted text-xs font-semibold transition-colors"
        >
          Restablecer paleta predeterminada
        </button>
      )}
    </div>
  );
}
