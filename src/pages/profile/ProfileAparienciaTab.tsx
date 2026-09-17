import { Moon, Palette, Sparkles, Sun, Monitor } from 'lucide-react';
import ThemePalettePicker from '../../components/ThemePalettePicker';
import { useTheme } from '../../context/ThemeContext';
import { PALETTES } from '../../config/themes';
import { CARD_PADDING, SECTION_GAP_LG, GRID_2COL, cn } from './ProfileDesignSystem';

interface ProfileAparienciaTabProps {
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
}

export function ProfileAparienciaTab({ theme, onThemeChange }: ProfileAparienciaTabProps) {
  const { authBgEffect, setAuthBgEffect, palette } = useTheme();

  return (
    <div className={cn('w-full', SECTION_GAP_LG)}>
      {/* Color de Acento */}
      <div
        className={cn(
          'space-y-3',
          CARD_PADDING,
          'border',
          'border-border/80',
          'bg-surface',
          'rounded-xl'
        )}
      >
        <div className="flex items-center gap-2">
          <div className="bg-brand/10 rounded-xl p-2">
            <Palette className="text-brand h-5 w-5" />
          </div>
          <div>
            <h3 className="text-text text-lg font-semibold tracking-[-0.01em]">Color de acento</h3>
            <p className="text-text-muted text-sm">Personaliza el color principal de la interfaz</p>
          </div>
        </div>
        <ThemePalettePicker />
      </div>

      {/* Tema Claro / Oscuro */}
      <div
        className={cn(
          'space-y-3',
          CARD_PADDING,
          'border',
          'border-border/80',
          'bg-surface',
          'rounded-xl'
        )}
      >
        <div className="flex items-center gap-2">
          <div className="bg-brand/10 rounded-xl p-2">
            <Monitor className="text-brand h-5 w-5" />
          </div>
          <div>
            <h3 className="text-text text-lg font-semibold tracking-[-0.01em]">
              Modo de apariencia
            </h3>
            <p className="text-text-muted text-sm">También se aplica en la barra superior</p>
          </div>
        </div>
        <div className={GRID_2COL}>
          <button
            type="button"
            onClick={() => onThemeChange('light')}
            className={cn(
              'relative flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all',
              theme === 'light'
                ? 'border-brand bg-brand/5'
                : 'border-border/50 bg-surface hover:border-border/70 hover:bg-surface-raised/50'
            )}
          >
            <div className="bg-surface border-border/50 shrink-0 rounded-xl border p-3">
              <Sun
                className={cn('h-5 w-5', theme === 'light' ? 'text-brand' : 'text-text-muted')}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-text font-semibold">Claro</span>
                {theme === 'light' && (
                  <span className="bg-brand/10 text-brand rounded-full px-1.5 py-0.5 text-xs font-medium">
                    Activo
                  </span>
                )}
              </div>
              <p className="text-text-muted mt-0.5 text-sm">Interfaz luminosa para uso diurno</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onThemeChange('dark')}
            className={cn(
              'relative flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all',
              theme === 'dark'
                ? 'border-brand bg-brand/5'
                : 'border-border/50 bg-surface hover:border-border/70 hover:bg-surface-raised/50'
            )}
          >
            <div className="bg-surface border-border/50 shrink-0 rounded-xl border p-3">
              <Moon
                className={cn('h-5 w-5', theme === 'dark' ? 'text-brand' : 'text-text-muted')}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-text font-semibold">Oscuro</span>
                {theme === 'dark' && (
                  <span className="bg-brand/10 text-brand rounded-full px-1.5 py-0.5 text-xs font-medium">
                    Activo
                  </span>
                )}
              </div>
              <p className="text-text-muted mt-0.5 text-sm">Ideal para ambientes con poca luz</p>
            </div>
          </button>
        </div>
      </div>

      {/* Efectos de Fondo */}
      <div
        className={cn(
          'space-y-3',
          CARD_PADDING,
          'border',
          'border-border/80',
          'bg-surface',
          'rounded-xl'
        )}
      >
        <div className="flex items-center gap-2">
          <div className="bg-brand/10 rounded-xl p-2">
            <Sparkles className="text-brand h-5 w-5" />
          </div>
          <div>
            <h3 className="text-text text-lg font-semibold tracking-[-0.01em]">
              Efecto de fondo en inicio de sesión
            </h3>
            <p className="text-text-muted text-sm">Personaliza la animación y atmósfera visual</p>
          </div>
        </div>
        <div className={GRID_2COL}>
          <button
            type="button"
            onClick={() => setAuthBgEffect('antigravity')}
            className={cn(
              'relative flex cursor-pointer flex-col items-start gap-2 rounded-xl border p-4 transition-all',
              authBgEffect === 'antigravity'
                ? 'border-brand bg-brand/5'
                : 'border-border/50 bg-surface hover:border-border/70 hover:bg-surface-raised/50'
            )}
          >
            <div className="flex items-center gap-2">
              <div className="bg-surface border-border/50 rounded-xl border p-2">
                <Sparkles className="text-brand h-5 w-5" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text font-semibold">Antigravedad Dinámica</span>
                {authBgEffect === 'antigravity' && (
                  <span className="bg-brand/10 text-brand rounded-full px-1.5 py-0.5 text-xs font-medium">
                    Activo
                  </span>
                )}
              </div>
            </div>
            <p className="text-text-muted text-sm">
              Partículas flotantes interactivas con físicas espaciales y respuesta al cursor
            </p>
          </button>

          <button
            type="button"
            onClick={() => setAuthBgEffect('theme')}
            className={cn(
              'relative flex cursor-pointer flex-col items-start gap-2 rounded-xl border p-4 transition-all',
              authBgEffect === 'theme'
                ? 'border-brand bg-brand/5'
                : 'border-border/50 bg-surface hover:border-border/70 hover:bg-surface-raised/50'
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className="border-border h-4 w-4 shrink-0 rounded-full border"
                style={{ backgroundColor: PALETTES[palette]?.swatch.dark ?? 'var(--color-brand)' }}
              />
              <div className="flex items-center gap-2">
                <span className="text-text font-semibold">Color de mi tema</span>
                {authBgEffect === 'theme' && (
                  <span className="bg-brand/10 text-brand rounded-full px-1.5 py-0.5 text-xs font-medium">
                    Activo
                  </span>
                )}
              </div>
            </div>
            <p className="text-text-muted text-sm">
              Iluminación reactiva sincronizada con tu color de acento activo actual
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
