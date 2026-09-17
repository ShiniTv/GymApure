import { Moon, Palette, Sparkles, Sun, Monitor } from 'lucide-react';
import ThemePalettePicker from '../../components/ThemePalettePicker';
import { useTheme } from '../../context/ThemeContext';
import { CARD_PADDING, SECTION_GAP_LG, cn } from './ProfileDesignSystem';

interface ProfileAparienciaTabProps {
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
}

export function ProfileAparienciaTab({ theme, onThemeChange }: ProfileAparienciaTabProps) {
  const { authBgEffect, setAuthBgEffect } = useTheme();

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
        className={cn('space-y-2.5', CARD_PADDING, 'border-border/80 bg-surface rounded-xl border')}
      >
        <div className="flex items-center gap-2">
          <div className="bg-brand/10 rounded-lg p-1.5">
            <Monitor className="text-brand h-4 w-4" />
          </div>
          <div>
            <h3 className="text-text text-sm font-semibold tracking-[-0.01em]">
              Modo de apariencia
            </h3>
            <p className="text-text-muted text-xs">
              Ajuste de tema del sistema y barras de interfaz
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onThemeChange('light')}
            className={cn(
              'relative flex cursor-pointer items-center justify-center gap-2.5 rounded-xl border p-2.5 transition-all',
              theme === 'light'
                ? 'border-brand bg-brand/5 font-semibold shadow-2xs'
                : 'border-border bg-surface hover:border-border/80'
            )}
          >
            <Sun className={cn('h-4 w-4', theme === 'light' ? 'text-brand' : 'text-text-muted')} />
            <span className="text-text text-xs">Claro</span>
            {theme === 'light' && (
              <span className="bg-brand/15 text-brand text-small rounded-full px-1.5 py-0.5 font-bold">
                Activo
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => onThemeChange('dark')}
            className={cn(
              'relative flex cursor-pointer items-center justify-center gap-2.5 rounded-xl border p-2.5 transition-all',
              theme === 'dark'
                ? 'border-brand bg-brand/5 font-semibold shadow-2xs'
                : 'border-border bg-surface hover:border-border/80'
            )}
          >
            <Moon className={cn('h-4 w-4', theme === 'dark' ? 'text-brand' : 'text-text-muted')} />
            <span className="text-text text-xs">Oscuro</span>
            {theme === 'dark' && (
              <span className="bg-brand/15 text-brand text-small rounded-full px-1.5 py-0.5 font-bold">
                Activo
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Efectos de Fondo */}
      <div
        className={cn('space-y-2.5', CARD_PADDING, 'border-border/80 bg-surface rounded-xl border')}
      >
        <div className="flex items-center gap-2">
          <div className="bg-brand/10 rounded-lg p-1.5">
            <Sparkles className="text-brand h-4 w-4" />
          </div>
          <div>
            <h3 className="text-text text-sm font-semibold tracking-[-0.01em]">
              Atmósfera en inicio de sesión
            </h3>
            <p className="text-text-muted text-xs">
              Efecto visual reactivo para la pantalla de acceso
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAuthBgEffect('antigravity')}
            className={cn(
              'relative flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-left transition-all',
              authBgEffect === 'antigravity'
                ? 'border-brand bg-brand/5 font-semibold shadow-2xs'
                : 'border-border bg-surface hover:border-border/80'
            )}
          >
            <div className="bg-surface border-border/50 shrink-0 rounded-lg border p-1.5">
              <Sparkles className="text-brand h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-text truncate text-xs font-semibold">Antigravedad</p>
              <p className="text-text-muted text-small truncate">Partículas activas</p>
            </div>
            {authBgEffect === 'antigravity' && (
              <span className="bg-brand/15 text-brand text-small shrink-0 rounded-full px-1.5 py-0.5 font-bold">
                Activo
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setAuthBgEffect('theme')}
            className={cn(
              'relative flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-left transition-all',
              authBgEffect === 'theme'
                ? 'border-brand bg-brand/5 font-semibold shadow-2xs'
                : 'border-border bg-surface hover:border-border/80'
            )}
          >
            <div className="bg-surface border-border/50 flex shrink-0 items-center justify-center rounded-lg border p-1.5">
              <span className="bg-brand h-3.5 w-3.5 rounded-full border border-black/10" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-text truncate text-xs font-semibold">Color de tema</p>
              <p className="text-text-muted text-small truncate">Luz ambiental</p>
            </div>
            {authBgEffect === 'theme' && (
              <span className="bg-brand/15 text-brand text-small shrink-0 rounded-full px-1.5 py-0.5 font-bold">
                Activo
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
