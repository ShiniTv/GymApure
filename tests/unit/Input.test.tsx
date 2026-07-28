import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Input, Label } from '../../src/components/ui/Input';

afterEach(() => cleanup());

describe('Input + Label', () => {
  it('shows error alert text when error is set', () => {
    render(<Input aria-label="Correo" error="Correo inválido" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Correo inválido');
    expect(screen.getByLabelText('Correo')).toHaveAttribute('aria-invalid', 'true');
  });

  it('wires Label htmlFor to input id', () => {
    render(
      <>
        <Label htmlFor="member-email">Correo miembro</Label>
        <Input id="member-email" />
      </>
    );
    expect(screen.getByLabelText('Correo miembro')).toHaveAttribute('id', 'member-email');
  });
});
