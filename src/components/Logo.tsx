import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { getBrandLogoSrc, type BrandLogoMode } from '../config/brand';

interface LogoProps {
  className?: string;
  /** auto = sigue el tema; light/dark = fuerza variante (p. ej. kiosk en fondo oscuro) */
  mode?: BrandLogoMode | 'auto';
  fetchPriority?: 'high' | 'low' | 'auto';
}

/** Misma escala en ambos temas — el asset claro ya tiene la proporción correcta. */
const LOGO_SCALE = 'scale-[1.08]';

export default function Logo({
  className = 'h-8 w-8',
  mode = 'auto',
  fetchPriority = 'auto',
}: LogoProps) {
  const { theme } = useTheme();
  const logoMode: BrandLogoMode = mode === 'auto' ? theme : mode;

  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex shrink-0 overflow-hidden rounded-full', className)}
    >
      <img
        src={getBrandLogoSrc(logoMode)}
        alt=""
        fetchPriority={fetchPriority}
        decoding="async"
        className={cn('h-full w-full object-cover object-center', LOGO_SCALE)}
      />
    </span>
  );
}
