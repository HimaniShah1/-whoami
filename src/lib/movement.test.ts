import { describe, expect, it } from 'vitest';
import { applyGravity, headBobOffset, smoothVelocity } from './movement';

describe('smoothVelocity', () => {
  it('returns target unchanged when current already equals target', () => {
    expect(smoothVelocity(5, 5, 0.016, 8)).toBe(5);
  });

  it('moves partway toward target in a single step, not all the way', () => {
    const next = smoothVelocity(0, 10, 0.016, 8);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(10);
  });

  it('converges toward target over many repeated steps', () => {
    let value = 0;
    for (let i = 0; i < 200; i++) {
      value = smoothVelocity(value, 10, 0.016, 8);
    }
    expect(value).toBeCloseTo(10, 1);
  });

  it('converges faster with higher responsiveness', () => {
    const slow = smoothVelocity(0, 10, 0.016, 2);
    const fast = smoothVelocity(0, 10, 0.016, 16);
    expect(fast).toBeGreaterThan(slow);
  });

  it('is framerate-independent: N small steps equal one large step', () => {
    let stepped = 0;
    for (let i = 0; i < 10; i++) stepped = smoothVelocity(stepped, 10, 0.01, 8);
    expect(stepped).toBeCloseTo(smoothVelocity(0, 10, 0.1, 8), 12);
  });

  it('never overshoots the target, even on a huge delta', () => {
    expect(smoothVelocity(0, 10, 10, 8)).toBeLessThanOrEqual(10);
  });
});

describe('headBobOffset', () => {
  it('is zero at zero distance traveled', () => {
    expect(headBobOffset(0, 0.05, 10)).toBe(0);
  });

  it('stays within [-amplitude, amplitude]', () => {
    for (let d = 0; d < 10; d += 0.1) {
      const offset = headBobOffset(d, 0.05, 10);
      expect(offset).toBeGreaterThanOrEqual(-0.05);
      expect(offset).toBeLessThanOrEqual(0.05);
    }
  });

  it('scales linearly with amplitude', () => {
    const small = headBobOffset(0.1, 0.05, 10);
    const large = headBobOffset(0.1, 0.1, 10);
    expect(Math.abs(large)).toBeCloseTo(Math.abs(small) * 2, 5);
  });
});

describe('applyGravity', () => {
  it('reduces velocity over time (gravity pulls downward)', () => {
    expect(applyGravity(5, 0.1, 20)).toBeCloseTo(3, 5);
  });

  it('keeps making velocity more negative when already falling', () => {
    expect(applyGravity(-5, 0.1, 20)).toBeCloseTo(-7, 5);
  });

  it('is a no-op when delta is zero', () => {
    expect(applyGravity(5, 0, 20)).toBe(5);
  });
});
