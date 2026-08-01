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

  it('returns exactly the 10 expected lines in order', () => {
    const lines = buildBootScript('req_abc123', 'HTTP/2', 64);
    expect(lines).toHaveLength(10);
    expect(lines).toEqual([
      'Incoming request...',
      'Assigning request ID: req_abc123',
      'Protocol negotiated: HTTP/2',
      'TTL allocated: 64',
      'Performing TLS handshake... OK',
      'Allocating worker... OK',
      'Connecting to cluster... OK',
      'Authenticating... OK',
      'Loading services...',
      'Backend ready.',
    ]);
  });

  it('produces a fresh array each call (no shared mutable state)', () => {
    const a = buildBootScript('req_a', 'HTTP/2', 64);
    const b = buildBootScript('req_b', 'HTTP/1.1', 32);
    a.push('mutated');
    expect(b).not.toContain('mutated');
  });
});
