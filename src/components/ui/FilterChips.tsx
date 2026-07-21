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
  /** Stretch segmented bar to container width. Default: true. */
  fullWidth?: boolean;
}

/** List filters — always the same segmented bar as profile tabs (no scroll pills). */
export function FilterChips({
  options,
  value,
  onChange,
  className,
  fullWidth = true,
}: FilterChipsProps) {
  return (
    <SegmentedControl
      variant="compact"
      layout="wrap"
      fullWidth={fullWidth}
      className={className}
      ariaLabel="Filtros"
      value={value}
      onChange={onChange}
      options={options}
    />
  );
}
