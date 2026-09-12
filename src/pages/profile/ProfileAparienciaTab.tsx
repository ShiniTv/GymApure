import { Moon, Palette, Sparkles, Sun } from 'lucide-react';
import { Button, Card } from '../../components/ui';
import ThemePalettePicker from '../../components/ThemePalettePicker';
import { useTheme } from '../../context/ThemeContext';
import { PALETTES } from '../../config/themes';
import { cn } from '../../lib/utils';

interface ProfileAparienciaTabProps {
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
}

export function ProfileAparienciaTab({ theme, onThemeChange }: ProfileAparienciaTabProps) {
  const { authBgEffect, setAuthBgEffect, palette } = useTheme();

  return (
    <div className="w-full">
      <Card padding="md" rounded="xl" className="border-border bg-surface">
        <h2 className="text-text mb-3 flex items-center gap-1.5 text-sm font-semibold md:text-sm">
          <Palette className="text-brand h-3.5 w-3.5" />
          Apariencia
        </h2>

        <div className="md:grid md:grid-cols-2 md:gap-4">
          <div>
            <p className="text-text-muted text-small mb-2 font-medium">Color de acento</p>
            <ThemePalettePicker />
          </div>

          <div className="border-border-subtle mt-4 border-t pt-3 md:mt-0 md:border-t-0 md:border-l md:pt-0 md:pl-6 lg:pl-8">
            <p className="text-text-muted text-small mb-2 font-medium">
              Fondo · también en la barra superior
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={theme === 'light' ? 'primary' : 'secondary'}
                onClick={() => onThemeChange('light')}
                className="flex-1"
              >
                <Sun className="h-4 w-4" />
                Claro
              </Button>
              <Button
                type="button"
                size="sm"
                variant={theme === 'dark' ? 'primary' : 'secondary'}
                onClick={() => onThemeChange('dark')}
                className="flex-1"
              >
                <Moon className="h-4 w-4" />
                Oscuro
              </Button>
            </div>
          </div>
        </div>

        <div className="border-border-subtle mt-5 border-t pt-4">
          <div className="mb-2 flex items-center gap-1.5">
            <Sparkles className="text-brand h-3.5 w-3.5" />
            <p className="text-text text-xs font-semibold">Fondo interactivo de inicio de sesión</p>
          </div>
          <p className="text-text-muted text-small mb-3 leading-relaxed">
            Elige el estilo de iluminación y matriz de puntos interactiva que responde al cursor en
            la pantalla de acceso.
          </p>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setAuthBgEffect('antigravity')}
              className={cn(
                'relative flex cursor-pointer flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors',
                authBgEffect === 'antigravity'
                  ? 'border-brand bg-brand/5 shadow-sm'
                  : 'border-border bg-surface hover:border-border'
              )}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 via-violet-500 to-cyan-400" />
                <span className="text-text text-xs font-semibold">Estilo Antigravity</span>
                <span className="bg-surface-overlay text-text-muted rounded-full px-1.5 py-0.5 text-[0.625rem] font-medium">
                  Predeterminado
                </span>
              </div>
              <p className="text-text-muted text-small leading-snug">
                Aura multicolor dinámica (ámbar, violeta y cian) con puntos interactivos estilo
                Google Antigravity.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setAuthBgEffect('theme')}
              className={cn(
                'relative flex cursor-pointer flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors',
                authBgEffect === 'theme'
                  ? 'border-brand bg-brand/5 shadow-sm'
                  : 'border-border bg-surface hover:border-border'
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className="border-border h-4 w-4 shrink-0 rounded-full border"
                  style={{
                    backgroundColor: PALETTES[palette]?.swatch.dark ?? 'var(--color-brand)',
                  }}
                />
                <span className="text-text text-xs font-semibold">Color de mi tema</span>
                <span className="bg-brand/10 text-brand rounded-full px-1.5 py-0.5 text-[0.625rem] font-medium">
                  {PALETTES[palette]?.label ?? 'Personalizado'}
                </span>
              </div>
              <p className="text-text-muted text-small leading-snug">
                Iluminación reactiva sincronizada con tu color de acento activo actual.
              </p>
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
