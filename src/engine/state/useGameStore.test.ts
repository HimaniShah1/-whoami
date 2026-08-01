import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './useGameStore';

const initial = useGameStore.getState();

beforeEach(() => {
  useGameStore.setState(
    {
      ...initial,
      currentRoomId: 'load-balancer',
      visitedRooms: new Set(['load-balancer']),
      collectedEasterEggs: new Set(),
    },
    true,
  );
});

describe('useGameStore', () => {
  it('starts in the load-balancer room with it already visited', () => {
    const state = useGameStore.getState();
    expect(state.currentRoomId).toBe('load-balancer');
    expect(state.visitedRooms.has('load-balancer')).toBe(true);
  });

  it('refuses to enter a room whose prerequisites are not visited', () => {
    useGameStore.getState().enterRoom('auth-service');
    expect(useGameStore.getState().currentRoomId).toBe('load-balancer');
  });

  it('enters a room once its prerequisite has been visited', () => {
    useGameStore.getState().enterRoom('api-gateway');
    const state = useGameStore.getState();
    expect(state.currentRoomId).toBe('api-gateway');
    expect(state.visitedRooms.has('api-gateway')).toBe(true);
  });

  it('isUnlocked reflects the same rule enterRoom enforces', () => {
    expect(useGameStore.getState().isUnlocked('auth-service')).toBe(false);
    useGameStore.getState().enterRoom('api-gateway');
    expect(useGameStore.getState().isUnlocked('auth-service')).toBe(true);
  });

  it('collectEasterEgg adds the id without losing previous ones', () => {
    useGameStore.getState().collectEasterEgg('sudo-rm-rf');
    useGameStore.getState().collectEasterEgg('docker-ps');
    const eggs = useGameStore.getState().collectedEasterEggs;
    expect(eggs.has('sudo-rm-rf')).toBe(true);
    expect(eggs.has('docker-ps')).toBe(true);
  });
});
