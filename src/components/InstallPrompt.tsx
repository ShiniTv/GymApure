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
        'inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800',
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
