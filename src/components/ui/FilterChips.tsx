import { SegmentedControl } from './SegmentedControl';

export interface FilterChipOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterChipsProps {
  options: FilterChipOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /**
   * Stretch chips to container width.
   * Default false (hug content) — use true on mobile for primary tab rows with many options.
   */
  fullWidth?: boolean;
  /** Accessible name for the filter group. */
  ariaLabel?: string;
  /** Prefer scroll on mobile when there are many chips. */
  layout?: 'wrap' | 'scroll';
}

/** Compact list filters — hug content on desktop; pass fullWidth only when needed. */
export function FilterChips({
  options,
  value,
  onChange,
  className,
  fullWidth = false,
  ariaLabel = 'Filtros',
  layout = 'wrap',
}: FilterChipsProps) {
  return (
    <SegmentedControl
      variant="compact"
      layout={layout}
      fullWidth={fullWidth}
      className={className}
      ariaLabel={ariaLabel}
      value={value}
      onChange={onChange}
      options={options}
    />
  );
}
