import { beforeEach, describe, expect, it } from 'vitest';
import { audioManager } from './AudioManager';
import { useUIStore } from '@/engine/state/useUIStore';

beforeEach(() => {
  useUIStore.setState({ audioMuted: false, volume: 0.6 });
});

describe('audioManager', () => {
  it('does not throw when playing an ambient key that was never registered', () => {
    expect(() => audioManager.playAmbient('nonexistent')).not.toThrow();
  });

  it('does not throw when stopping ambient audio with nothing playing', () => {
    expect(() => audioManager.stopAmbient()).not.toThrow();
  });

  it('does not throw when playing an sfx key that was never registered', () => {
    expect(() => audioManager.playSfx('nonexistent')).not.toThrow();
  });
});
