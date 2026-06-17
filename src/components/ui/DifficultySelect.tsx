import { Select } from './Select';
import { formatDifficulty } from '../../lib/utils';

const DIFFICULTY_VALUES = ['Beginner', 'Intermediate', 'Advanced'] as const;

interface DifficultySelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function DifficultySelect({ value, onChange, className }: DifficultySelectProps) {
  return (
    <Select
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {DIFFICULTY_VALUES.map((d) => (
        <option key={d} value={d}>
          {formatDifficulty(d)}
        </option>
      ))}
    </Select>
  );
}
