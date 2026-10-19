import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CustomSelect } from '../../src/components/ui/CustomSelect';

afterEach(() => cleanup());

const mockOptions = [
  { value: '', label: 'En blanco' },
  { value: '1', label: 'Rutina Full Body' },
  { value: '2', label: 'Cardio Intenso' },
];

describe('CustomSelect', () => {
  it('renders trigger with selected option label', () => {
    render(<CustomSelect value="1" onChange={() => {}} options={mockOptions} />);
    expect(screen.getByRole('button')).toHaveTextContent('Rutina Full Body');
  });

  it('renders placeholder when value does not match', () => {
    render(
      <CustomSelect
        value=""
        onChange={() => {}}
        options={mockOptions}
        placeholder="Seleccionar rutina"
      />
    );
    expect(screen.getByRole('button')).toHaveTextContent('En blanco');
  });

  it('opens options list when clicked and triggers onChange', () => {
    const handleChange = vi.fn();
    render(<CustomSelect value="" onChange={handleChange} options={mockOptions} />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');

    const option = screen.getByText('Rutina Full Body');
    fireEvent.click(option);

    expect(handleChange).toHaveBeenCalledWith('1');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });
});
