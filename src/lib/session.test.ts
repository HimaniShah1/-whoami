import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hasSeenBootSequence, markBootSequenceSeen } from './session';

describe('session', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hasSeenBootSequence returns false when nothing has been marked', () => {
    expect(hasSeenBootSequence()).toBe(false);
  });

  it('hasSeenBootSequence returns true after markBootSequenceSeen', () => {
    markBootSequenceSeen();
    expect(hasSeenBootSequence()).toBe(true);
  });

  it('hasSeenBootSequence returns false if sessionStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(hasSeenBootSequence()).toBe(false);
  });

  it('markBootSequenceSeen does not throw if sessionStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => markBootSequenceSeen()).not.toThrow();
  });
});
