import { useEffect } from 'react';

const TITLES: Record<string, string> = {
  '/': 'Inicio',
  '/routines': 'Rutinas',
  '/nutrition': 'Nutrición',
  '/history': 'Historial',
  '/history/records': 'Marcas',
  '/profile': 'Perfil',
  '/payments': 'Pagos',
  '/messages': 'Mensajes',
};

export function usePageTitle(title?: string, suffix = 'GymApure') {
  useEffect(() => {
    const base = title ?? TITLES[window.location.pathname] ?? '';
    document.title = base ? `${base} · ${suffix}` : suffix;
    return () => {
      document.title = suffix;
    };
  }, [title, suffix]);
}

export function useWorkoutPageTitle(routineName?: string) {
  usePageTitle(routineName ? `Entrenando: ${routineName}` : 'Entrenamiento');
}
