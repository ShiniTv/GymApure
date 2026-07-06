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
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
  align?: 'start' | 'end';
}

export function AnchoredMenu({
  open,
  onClose,
  anchorRef,
  children,
  className,
  align = 'end',
}: AnchoredMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; minWidth: number } | null>(
    null
  );

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const minWidth = Math.max(rect.width, 160);
      const left = align === 'end' ? rect.right - minWidth : rect.left;
      setPosition({ top: rect.bottom + 4, left, minWidth });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, anchorRef, align]);

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
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open, onClose, anchorRef]);

  if (!open || !position) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      className={cn(
        'fixed z-[80] overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900',
        className
      )}
      style={{ top: position.top, left: position.left, minWidth: position.minWidth }}
    >
      {children}
    </div>,
    document.body
  );
}
