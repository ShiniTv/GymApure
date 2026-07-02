import { Check } from 'lucide-react';
import { DEFAULT_PALETTE, PALETTE_LIST, type PaletteId } from '../config/themes';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

export default function ThemePalettePicker() {
  const { palette, setPalette } = useTheme();

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-zinc-400 dark:text-zinc-300">
        8 paletas disponibles · combínalas con modo claro u oscuro
      </p>

      <div
        role="radiogroup"
        aria-label="Paleta de colores"
        className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
      >
        {PALETTE_LIST.map((item) => {
          const isActive = palette === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setPalette(item.id as PaletteId)}
              className={cn(
                'relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all touch-manipulation',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
                isActive
                  ? 'border-brand bg-brand/5 shadow-sm'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
              )}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="h-5 w-5 rounded-full border border-zinc-200 dark:border-zinc-700 shrink-0"
                  style={{ backgroundColor: item.swatch.light }}
                  aria-hidden
                />
                <span
                  className="h-5 w-5 rounded-full border border-zinc-700 shrink-0"
                  style={{ backgroundColor: item.swatch.dark }}
                  aria-hidden
                />
              </div>
              <div className="min-w-0 w-full">
                <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                  {item.label}
                </p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-snug mt-0.5 line-clamp-2">
                  {item.description}
                </p>
              </div>
              <div
                className="flex items-center gap-2 w-full pt-1 border-t border-zinc-100 dark:border-zinc-800"
                aria-hidden
              >
                <span
                  className="h-5 px-2 rounded-md text-[9px] font-semibold text-white flex items-center shrink-0"
                  style={{ backgroundColor: item.swatch.light }}
                >
                  Btn
                </span>
                <span
                  className="text-[10px] font-semibold truncate"
                  style={{ color: item.swatch.light }}
                >
                  Enlace
                </span>
              </div>
              {isActive && (
                <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full brand-solid">
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
          className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-brand transition-colors"
        >
          Restablecer paleta predeterminada
        </button>
      )}
    </div>
  );
}
