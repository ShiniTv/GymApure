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
      <Card padding="sm" rounded="xl" className="border-border bg-surface md:p-5">
        <h2 className="text-text mb-3 flex items-center gap-1.5 text-[13px] font-semibold md:text-sm">
          <Palette className="text-brand h-3.5 w-3.5" />
          Apariencia
        </h2>

        <div className="md:grid md:grid-cols-2 md:gap-4">
          <div>
            <p className="text-text-muted mb-2 text-[11px] font-medium">Color de acento</p>
            <ThemePalettePicker />
          </div>

          <div className="border-border-subtle mt-4 border-t pt-3 md:mt-0 md:border-t-0 md:border-l md:pt-0 md:pl-6 lg:pl-8">
            <p className="text-text-muted mb-2 text-[11px] font-medium">
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
