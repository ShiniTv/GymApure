import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useId,
  type ReactNode,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { fieldClassName } from './Input';

export interface CustomSelectOption {
  value: string;
  label: string;
  description?: string;
  badge?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  wrapperClassName?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  id?: string;
  'aria-label'?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar...',
  disabled = false,
  error,
  className,
  wrapperClassName,
  searchable,
  searchPlaceholder = 'Buscar opción...',
  id,
  'aria-label': ariaLabel,
}: CustomSelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    placement: 'bottom' | 'top';
  } | null>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Auto-enable search if there are 8 or more options unless explicitly set to false
  const showSearch = searchable ?? options.length >= 8;

  const filteredOptions =
    showSearch && searchTerm.trim()
      ? options.filter(
          (opt) =>
            opt.label.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
            Boolean(opt.description?.toLowerCase().includes(searchTerm.trim().toLowerCase()))
        )
      : options;

  // Calculate position
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const padding = 8;
    const estHeight = 240;

    const spaceBelow = window.innerHeight - rect.bottom - padding;
    const spaceAbove = rect.top - padding;
    const placeAbove = spaceBelow < estHeight && spaceAbove > spaceBelow;

    setCoords({
      top: placeAbove ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      placement: placeAbove ? 'top' : 'bottom',
    });
  };

  useLayoutEffect(() => {
    if (!isOpen) {
      setCoords(null);
      return;
    }
    updatePosition();

    const handleScrollOrResize = () => updatePosition();
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen]);

  // Handle focus into search input when opened
  useEffect(() => {
    if (isOpen) {
      if (showSearch) {
        // Small delay to ensure portal is mounted
        requestAnimationFrame(() => {
          searchInputRef.current?.focus();
        });
      }
      const currentIndex = filteredOptions.findIndex((opt) => opt.value === value);
      setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
    } else {
      setSearchTerm('');
      setHighlightedIndex(-1);
    }
  }, [isOpen, showSearch]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation on trigger
  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  // Keyboard navigation inside dropdown / search
  const handleMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        const current = filteredOptions[highlightedIndex];
        if (!current.disabled) {
          onChange(current.value);
          setIsOpen(false);
          triggerRef.current?.focus();
        }
      }
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const handleSelect = (val: string, isDisabled?: boolean) => {
    if (isDisabled) return;
    onChange(val);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className={cn('relative w-full', wrapperClassName)}>
      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          fieldClassName,
          'flex cursor-pointer items-center justify-between text-left select-none',
          'transition-all duration-150',
          isOpen && 'border-brand/70 ring-brand/25 dark:border-brand/70 ring-[2px]',
          error && 'border-danger focus:border-danger focus:ring-danger/25',
          disabled && 'pointer-events-none cursor-not-allowed opacity-50',
          className
        )}
      >
        <div className="mr-2 flex min-w-0 flex-1 items-center gap-2">
          {selectedOption?.icon && (
            <span className="text-text-muted shrink-0">{selectedOption.icon}</span>
          )}
          <span
            className={cn(
              'text-small truncate font-medium',
              selectedOption ? 'text-text' : 'text-text-muted'
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge}
        </div>

        <ChevronDown
          className={cn(
            'text-text-muted h-4 w-4 shrink-0 transition-transform duration-200',
            isOpen && 'text-brand rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {error && (
        <p className="text-danger text-small mt-1 font-medium" role="alert">
          {error}
        </p>
      )}

      {isOpen &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            tabIndex={-1}
            aria-activedescendant={
              highlightedIndex >= 0 && filteredOptions[highlightedIndex]
                ? `${selectId}-opt-${filteredOptions[highlightedIndex].value}`
                : undefined
            }
            onKeyDown={handleMenuKeyDown}
            style={{
              position: 'fixed',
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              top: coords.placement === 'top' ? undefined : `${coords.top}px`,
              bottom:
                coords.placement === 'top' ? `${window.innerHeight - coords.top}px` : undefined,
              zIndex: 100,
            }}
            className={cn(
              'border-border/80 bg-surface rounded-xl border shadow-2xl',
              'dark:bg-surface-raised dark:border-border/60 backdrop-blur-md',
              'flex flex-col overflow-hidden',
              'animate-in fade-in zoom-in-95 duration-100'
            )}
          >
            {showSearch && (
              <div className="border-border/60 bg-surface-raised/40 border-b p-2">
                <div className="relative flex items-center">
                  <Search className="text-text-muted pointer-events-none absolute left-2.5 h-3.5 w-3.5" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setHighlightedIndex(0);
                    }}
                    placeholder={searchPlaceholder}
                    className={cn(
                      'bg-surface-overlay/60 border-border/60 w-full rounded-lg border py-1.5 pr-3 pl-8',
                      'text-small text-text placeholder:text-text-muted/70 outline-none',
                      'focus:border-brand/70 focus:ring-brand/30 transition-all focus:ring-1'
                    )}
                  />
                </div>
              </div>
            )}

            <div className="max-h-56 space-y-0.5 overflow-y-auto overscroll-contain p-1.5">
              {filteredOptions.length === 0 ? (
                <div className="text-small text-text-muted px-3 py-5 text-center">
                  No se encontraron resultados
                </div>
              ) : (
                filteredOptions.map((opt, index) => {
                  const isSelected = opt.value === value;
                  const isHighlighted = highlightedIndex === index;

                  return (
                    <button
                      key={opt.value}
                      id={`${selectId}-opt-${opt.value}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={opt.disabled}
                      onClick={() => handleSelect(opt.value, opt.disabled)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={cn(
                        'text-small flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors select-none',
                        isSelected
                          ? 'bg-brand/12 text-brand font-semibold'
                          : isHighlighted
                            ? 'bg-surface-overlay text-text'
                            : 'text-text hover:bg-surface-overlay/80',
                        opt.disabled && 'pointer-events-none cursor-not-allowed opacity-40'
                      )}
                    >
                      <div className="mr-2 flex min-w-0 flex-1 items-center gap-2">
                        {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                        <div className="truncate">
                          <p className="truncate leading-snug">{opt.label}</p>
                          {opt.description && (
                            <p className="text-text-muted truncate text-xs leading-tight font-normal">
                              {opt.description}
                            </p>
                          )}
                        </div>
                        {opt.badge}
                      </div>

                      {isSelected && (
                        <Check className="text-brand ml-2 h-4 w-4 shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
