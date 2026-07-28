import { Moon, Palette, Sun } from 'lucide-react';
import { Button, Card } from '../../components/ui';
import ThemePalettePicker from '../../components/ThemePalettePicker';

interface ProfileAparienciaTabProps {
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
}

export function ProfileAparienciaTab({ theme, onThemeChange }: ProfileAparienciaTabProps) {
  return (
    <div className="w-full">
      <Card
        padding="sm"
        rounded="xl"
        className="border-zinc-200/70 bg-white/80 md:p-5 dark:border-zinc-800/80 dark:bg-zinc-900/50"
      >
        <h2 className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-zinc-900 md:text-sm dark:text-white">
          <Palette className="text-brand h-3.5 w-3.5" />
          Apariencia
        </h2>

        <div className="md:grid md:grid-cols-2 md:gap-4">
          <div>
            <p className="mb-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              Color de acento
            </p>
            <ThemePalettePicker />
          </div>

          <div className="mt-4 border-t border-zinc-100 pt-3 md:mt-0 md:border-t-0 md:border-l md:pt-0 md:pl-6 lg:pl-8 dark:border-zinc-800">
            <p className="mb-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
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
      </Card>
    </div>
  );
}
