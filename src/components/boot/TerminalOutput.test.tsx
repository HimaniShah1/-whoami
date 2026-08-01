import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TerminalOutput from './TerminalOutput';

describe('TerminalOutput', () => {
  it('renders each visible line and the rounded progress percentage', () => {
    render(
      <TerminalOutput
        visibleLines={['Incoming request...', 'Backend ready.']}
        progress={62.4}
        done={false}
        reducedMotion={false}
      />,
    );
    expect(screen.getByText('Incoming request...')).toBeInTheDocument();
    expect(screen.getByText('Backend ready.')).toBeInTheDocument();
    expect(screen.getByText('62%')).toBeInTheDocument();
  });

  it('shows the cursor while not done', () => {
    render(<TerminalOutput visibleLines={['line one']} progress={10} done={false} reducedMotion={false} />);
    expect(screen.getByText('_')).toBeInTheDocument();
  });

  it('hides the cursor once done', () => {
    render(<TerminalOutput visibleLines={['line one']} progress={100} done reducedMotion={false} />);
    expect(screen.queryByText('_')).not.toBeInTheDocument();
  });

  it('clamps progress into the 0-100 range (upper bound)', () => {
    render(<TerminalOutput visibleLines={[]} progress={150} done={false} reducedMotion={false} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('clamps progress into the 0-100 range (lower bound)', () => {
    render(<TerminalOutput visibleLines={[]} progress={-20} done={false} reducedMotion={false} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByTestId('boot-progress-fill')).toHaveStyle({ width: '0%' });
  });

  it('renders the progress bar fill with the rounded width', () => {
    render(<TerminalOutput visibleLines={[]} progress={62.4} done={false} reducedMotion={false} />);
    expect(screen.getByTestId('boot-progress-fill')).toHaveStyle({ width: '62%' });
  });

  it('applies the pulse animation to the cursor unless reducedMotion is set', () => {
    const { rerender } = render(
      <TerminalOutput visibleLines={['x']} progress={0} done={false} reducedMotion={false} />,
    );
    expect(screen.getByText('_')).toHaveClass('animate-pulse');

    rerender(<TerminalOutput visibleLines={['x']} progress={0} done={false} reducedMotion />);
    expect(screen.getByText('_')).not.toHaveClass('animate-pulse');
  });
});
