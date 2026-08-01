import { beforeEach, describe, expect, it } from 'vitest';
import { useUIStore } from './useUIStore';

const initial = useUIStore.getState();

beforeEach(() => {
  useUIStore.setState(initial, true);
});

describe('useUIStore', () => {
  it('toggleMute flips audioMuted', () => {
    expect(useUIStore.getState().audioMuted).toBe(false);
    useUIStore.getState().toggleMute();
    expect(useUIStore.getState().audioMuted).toBe(true);
  });

  it('setVolume clamps to the 0-1 range', () => {
    useUIStore.getState().setVolume(1.5);
    expect(useUIStore.getState().volume).toBe(1);
    useUIStore.getState().setVolume(-0.5);
    expect(useUIStore.getState().volume).toBe(0);
    useUIStore.getState().setVolume(0.3);
    expect(useUIStore.getState().volume).toBe(0.3);
  });

  it('openOverlay and closeOverlay toggle activeOverlay', () => {
    useUIStore.getState().openOverlay('contact');
    expect(useUIStore.getState().activeOverlay).toBe('contact');
    useUIStore.getState().closeOverlay();
    expect(useUIStore.getState().activeOverlay).toBeNull();
  });

  it('setReducedMotion stores the given value', () => {
    useUIStore.getState().setReducedMotion(true);
    expect(useUIStore.getState().reducedMotion).toBe(true);
  });
});
