import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { Download } from 'lucide-react';
import { cn } from '../lib/utils';

export function InstallPrompt({ className }: { className?: string }) {
  const { isSupported, isInstalled, promptInstall } = useInstallPrompt();

  if (!isSupported || isInstalled) return null;

  return (
    <button
      type="button"
      onClick={promptInstall}
      className={cn(
        'border-border bg-surface text-text-secondary hover:bg-surface-raised inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors',
        className
      )}
      aria-label="Instalar aplicación"
      title="Instalar GymApure en tu dispositivo"
    >
      <Download className="text-brand h-4 w-4" />
      <span className="hidden sm:inline">Instalar app</span>
    </button>
  );
}
