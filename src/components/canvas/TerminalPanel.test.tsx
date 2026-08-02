import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TerminalPanel from './TerminalPanel';

describe('TerminalPanel', () => {
  it('renders the title and each visible line', () => {
    render(
      <TerminalPanel
        title="lb-notes.md"
        visibleLines={['line one', 'line two']}
        done={false}
        reducedMotion={false}
      />,
    );
    expect(screen.getByText('lb-notes.md')).toBeInTheDocument();
    expect(screen.getByText('line one')).toBeInTheDocument();
    expect(screen.getByText('line two')).toBeInTheDocument();
  });

  it('shows the cursor while not done', () => {
    render(<TerminalPanel title="t" visibleLines={[]} done={false} reducedMotion={false} />);
    expect(screen.getByText('_')).toBeInTheDocument();
  });

  it('hides the cursor once done', () => {
    render(<TerminalPanel title="t" visibleLines={[]} done reducedMotion={false} />);
    expect(screen.queryByText('_')).not.toBeInTheDocument();
  });

  it('applies the pulse animation to the cursor unless reducedMotion is set', () => {
    const { rerender } = render(
      <TerminalPanel title="t" visibleLines={[]} done={false} reducedMotion={false} />,
    );
    expect(screen.getByText('_')).toHaveClass('animate-pulse');

    rerender(<TerminalPanel title="t" visibleLines={[]} done={false} reducedMotion />);
    expect(screen.getByText('_')).not.toHaveClass('animate-pulse');
  });
});
