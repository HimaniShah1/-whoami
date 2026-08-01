import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WebGLUnavailable from './WebGLUnavailable';

describe('WebGLUnavailable', () => {
  it('shows a fallback message with a way to reach the site owner', () => {
    render(<WebGLUnavailable />);
    expect(screen.getByText(/can.t render the backend/i)).toBeInTheDocument();
    expect(screen.getByText('himanishah@solvative.com')).toBeInTheDocument();
  });
});
