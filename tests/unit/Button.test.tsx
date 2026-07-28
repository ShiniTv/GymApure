import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../../src/components/ui/Button';

afterEach(() => cleanup());

describe('Button', () => {
  it('renders children and forwards click', async () => {
    const user = userEvent.setup();
    let clicked = 0;
    render(
      <Button
        type="button"
        onClick={() => {
          clicked += 1;
        }}
      >
        Guardar
      </Button>
    );
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(clicked).toBe(1);
  });

  it('disables interaction while loading', async () => {
    const user = userEvent.setup();
    let clicked = 0;
    render(
      <Button
        type="button"
        loading
        onClick={() => {
          clicked += 1;
        }}
      >
        Enviar
      </Button>
    );
    const btn = screen.getByRole('button', { name: /enviar/i });
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(clicked).toBe(0);
  });
});
