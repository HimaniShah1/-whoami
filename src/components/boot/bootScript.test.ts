import { describe, expect, it } from 'vitest';
import { buildBootScript } from './bootScript';

describe('buildBootScript', () => {
  it('returns the boot lines in order, interpolating the given identity', () => {
    const lines = buildBootScript('req_abc123', 'HTTP/2', 64);
    expect(lines[0]).toBe('Incoming request...');
    expect(lines).toContain('Assigning request ID: req_abc123');
    expect(lines).toContain('Protocol negotiated: HTTP/2');
    expect(lines).toContain('TTL allocated: 64');
    expect(lines[lines.length - 1]).toBe('Backend ready.');
  });

  it('produces a fresh array each call (no shared mutable state)', () => {
    const a = buildBootScript('req_a', 'HTTP/2', 64);
    const b = buildBootScript('req_b', 'HTTP/1.1', 32);
    a.push('mutated');
    expect(b).not.toContain('mutated');
  });
});
