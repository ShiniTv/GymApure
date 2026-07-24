import { Sparkles, Sun, Moon } from 'lucide-react';
import { Modal, Button } from '../ui';
import ThemePalettePicker from '../ThemePalettePicker';
import { useTheme } from '../../context/ThemeContext';
import { THEME_ONBOARDING_KEY } from '../../config/themes';

interface ThemeOnboardingProps {
  open: boolean;
  onComplete: () => void;
}

export function ThemeOnboarding({ open, onComplete }: ThemeOnboardingProps) {
  const { theme, toggleTheme } = useTheme();

  const handleComplete = () => {
    localStorage.setItem(THEME_ONBOARDING_KEY, '1');
    onComplete();
  };

  return (
    <Modal
      open={open}
      onClose={handleComplete}
      title="Personaliza tu experiencia"
      maxWidth="lg"
      scrollable
    >
      <div className="space-y-5">
        <p className="-mt-2 text-sm text-text-secondary">
          Elige cómo quieres ver GymApure. Puedes cambiarlo cuando quieras en tu perfil.
        </p>
        <div className="text-brand flex items-center gap-2">
          <Sparkles className="h-4 w-4" aria-hidden />
          <p className="text-sm font-semibold">Tu estilo, tu gym</p>
        </div>

        <div>
          <p className="label-caps mb-2">Modo</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => theme !== 'light' && toggleTheme()}
              className={`flex min-h-[var(--touch-min)] touch-manipulation items-center justify-center gap-2 rounded-xl border p-3 transition-all ${
                theme === 'light'
                  ? 'border-brand bg-brand/5 text-brand'
                  : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <Sun className="h-4 w-4" />
              <span className="text-sm font-semibold">Claro</span>
            </button>
            <button
              type="button"
              onClick={() => theme !== 'dark' && toggleTheme()}
              className={`flex min-h-[var(--touch-min)] touch-manipulation items-center justify-center gap-2 rounded-xl border p-3 transition-all ${
                theme === 'dark'
                  ? 'border-brand bg-brand/5 text-brand'
                  : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <Moon className="h-4 w-4" />
              <span className="text-sm font-semibold">Oscuro</span>
            </button>
          </div>
        </div>

        <div>
          <p className="label-caps mb-2">Paleta de color</p>
          <ThemePalettePicker />
        </div>

        <Button className="min-h-[var(--touch-comfort)] w-full" onClick={handleComplete}>
          Empezar a entrenar
        </Button>
      </div>
    </Modal>
  );
}
