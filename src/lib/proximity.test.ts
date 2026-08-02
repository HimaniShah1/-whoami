import { describe, expect, it } from 'vitest';
import { isWithinRadius } from './proximity';

describe('isWithinRadius', () => {
  it('is true when points are closer than the radius', () => {
    expect(isWithinRadius({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 2)).toBe(true);
  });

  it('is false when points are farther than the radius', () => {
    expect(isWithinRadius({ x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 0 }, 2)).toBe(false);
  });

  it('is true exactly at the radius boundary', () => {
    expect(isWithinRadius({ x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, 2)).toBe(true);
  });

  it('accounts for all three axes, not just the horizontal plane', () => {
    expect(isWithinRadius({ x: 0, y: 0, z: 0 }, { x: 0, y: 3, z: 0 }, 2)).toBe(false);
  });
});
