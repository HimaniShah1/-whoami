import { describe, expect, it } from 'vitest';
import {
  EYE_HEIGHT,
  PLAYER_CAPSULE_HALF_HEIGHT,
  PLAYER_CAPSULE_RADIUS,
  PLAYER_EYE_OFFSET,
} from './player';

describe('player capsule dimensions', () => {
  it('the capsule total height equals EYE_HEIGHT, so grounded eyes sit at EYE_HEIGHT with no separate tuning constant', () => {
    const capsuleHeight = 2 * (PLAYER_CAPSULE_HALF_HEIGHT + PLAYER_CAPSULE_RADIUS);
    expect(capsuleHeight).toBeCloseTo(EYE_HEIGHT);
  });

  it('PLAYER_EYE_OFFSET is exactly half the capsule height (eyes sit at the capsule top)', () => {
    expect(PLAYER_EYE_OFFSET).toBeCloseTo(EYE_HEIGHT / 2);
  });
});
