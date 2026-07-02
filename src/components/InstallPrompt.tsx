import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { Download } from 'lucide-react';

export function InstallPrompt() {
  const { isSupported, isInstalled, promptInstall } = useInstallPrompt();

  if (!isSupported || isInstalled) return null;

  return (
    <button
      type="button"
      onClick={promptInstall}
      className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      aria-label="Instalar aplicación"
      title="Instalar GymApure en tu dispositivo"
    >
      <Download className="h-4 w-4 text-brand" />
      <span className="hidden sm:inline">Instalar app</span>
    </button>
  );
}
