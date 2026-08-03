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

  it('renders a non-breaking space for a blank line so it still takes up vertical space', () => {
    render(
      <TerminalPanel
        title="t"
        visibleLines={['first', '', 'third']}
        done={false}
        reducedMotion={false}
      />,
    );
    // RTL's default text normalizer trims/collapses whitespace, and JS
    // treats U+00A0 (non-breaking space) as trimmable whitespace too — so a
    // default getByText(' ') query normalizes both a plain space and an NBSP
    // down to '', making them indistinguishable and producing a false
    // negative here. Disabling the normalizer lets us assert on the raw
    // text content and actually discriminate NBSP from a plain space.
    expect(
      screen.getByText(' ', { normalizer: (text) => text }),
    ).toBeInTheDocument();
  });
});
