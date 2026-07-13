import { Check } from 'lucide-react';
import { DEFAULT_PALETTE, PALETTE_LIST } from '../config/themes';
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
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"
      >
        {PALETTE_LIST.map((item) => {
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
                  : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700'
              )}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="h-5 w-5 shrink-0 rounded-full border border-zinc-200 dark:border-zinc-700"
                  style={{ backgroundColor: item.swatch.light }}
                  aria-hidden
                />
                <span
                  className="h-5 w-5 shrink-0 rounded-full border border-zinc-700"
                  style={{ backgroundColor: item.swatch.dark }}
                  aria-hidden
                />
              </div>
              <div className="w-full min-w-0">
                <p className="truncate text-xs font-semibold text-zinc-900 dark:text-white">
                  {item.label}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-zinc-500 dark:text-zinc-400">
                  {item.description}
                </p>
              </div>
              <div
                className="flex w-full items-center gap-2 border-t border-zinc-100 pt-1 dark:border-zinc-800"
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
          className="hover:text-brand text-xs font-semibold text-zinc-500 transition-colors dark:text-zinc-400"
        >
          Restablecer paleta predeterminada
        </button>
      )}
    </div>
  );
}
