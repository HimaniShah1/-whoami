import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('joins truthy class values and drops falsy ones', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });

  it('lets later Tailwind classes win over conflicting earlier ones', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});
