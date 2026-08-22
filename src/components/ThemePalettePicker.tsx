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
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"
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
                'relative flex touch-manipulation flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all',
                'focus-visible:ring-brand/50 focus:outline-none focus-visible:ring-2',
                isActive
                  ? 'border-brand bg-brand/5 shadow-sm'
                  : 'border-border bg-surface hover:border-border'
              )}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="border-border h-5 w-5 shrink-0 rounded-full border"
                  style={{ backgroundColor: item.swatch.light }}
                  aria-hidden
                />
                <span
                  className="border-border h-5 w-5 shrink-0 rounded-full border"
                  style={{ backgroundColor: item.swatch.dark }}
                  aria-hidden
                />
              </div>
              <div className="w-full min-w-0">
                <p className="text-text truncate text-xs font-semibold">{item.label}</p>
                <p className="text-text-muted mt-0.5 line-clamp-2 text-[10px] leading-snug">
                  {item.description}
                </p>
              </div>
              <div
                className="border-border-subtle flex w-full items-center gap-2 border-t pt-1"
                aria-hidden
              >
                <span
                  className="flex h-5 shrink-0 items-center rounded-md px-2 text-[9px] font-semibold text-white"
                  style={{ backgroundColor: item.swatch.light }}
                >
                  Btn
                </span>
                <span
                  className="truncate text-[10px] font-semibold"
                  style={{ color: item.swatch.light }}
                >
                  Enlace
                </span>
              </div>
              {isActive && (
                <span className="brand-solid absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full">
                  <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                </span>
              )}
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
