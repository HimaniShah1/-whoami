import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ConnectionLost from './ConnectionLost';

describe('ConnectionLost', () => {
  it('reloads the page when the Reload button is clicked', () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload },
      writable: true,
    });

    render(<ConnectionLost />);
    fireEvent.click(screen.getByRole('button', { name: /reload/i }));

    expect(reload).toHaveBeenCalledOnce();
  });
});
