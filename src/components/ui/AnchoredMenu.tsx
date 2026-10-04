import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

interface AnchoredMenuProps {
  open: boolean;
  onClose: () => void;
  anchorRef?: RefObject<HTMLElement | null>;
  anchorEl?: HTMLElement | null;
  children: ReactNode;
  className?: string;
  align?: 'start' | 'end';
}

export function AnchoredMenu({
  open,
  onClose,
  anchorRef,
  anchorEl,
  children,
  className,
  align = 'end',
}: AnchoredMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; minWidth: number } | null>(
    null
  );

  useLayoutEffect(() => {
    const targetAnchor = anchorEl ?? anchorRef?.current;
    if (!open || !targetAnchor) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const anchor = anchorEl ?? anchorRef?.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const padding = 12;
      const menuEl = menuRef.current;
      const menuWidth = menuEl?.offsetWidth || 200;
      const menuHeight = menuEl?.offsetHeight || 260;
      const minWidth = Math.max(rect.width, 160);

      // Determine horizontal alignment with auto-flip
      let effectiveAlign = align;
      if (effectiveAlign === 'end') {
        // If aligning to end would push it off the left edge, flip to start
        if (
          rect.right - menuWidth < padding &&
          rect.left + menuWidth <= window.innerWidth - padding
        ) {
          effectiveAlign = 'start';
        }
      } else {
        // If aligning to start would push it off the right edge, flip to end
        if (
          rect.left + menuWidth > window.innerWidth - padding &&
          rect.right - menuWidth >= padding
        ) {
          effectiveAlign = 'end';
        }
      }

      let left = effectiveAlign === 'end' ? rect.right - menuWidth : rect.left;
      // Clamp within viewport
      left = Math.max(padding, Math.min(left, window.innerWidth - menuWidth - padding));

      // Determine vertical placement (below or above)
      let top = rect.bottom + 4;
      if (top + menuHeight > window.innerHeight - padding && rect.top - 4 - menuHeight >= padding) {
        top = rect.top - 4 - menuHeight;
      } else if (top + menuHeight > window.innerHeight - padding) {
        // Fallback: clamp so it stays on screen
        top = Math.max(padding, window.innerHeight - menuHeight - padding);
      }

      setPosition({ top, left, minWidth });
    };

    updatePosition();
    // Second pass after DOM paint to use precise rendered dimensions
    const rafId = requestAnimationFrame(updatePosition);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, anchorRef, anchorEl, align]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      const currentAnchor = anchorEl ?? anchorRef?.current;
      if (currentAnchor?.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open, onClose, anchorRef, anchorEl]);

  if (!open || !position) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      className={cn(
        'border-border bg-surface fixed z-[80] max-h-[calc(100vh-24px)] overflow-y-auto rounded-lg border py-1 shadow-lg',
        className
      )}
      style={{ top: position.top, left: position.left, minWidth: position.minWidth }}
    >
      {children}
    </div>,
    document.body
  );
}
