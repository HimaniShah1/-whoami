import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from './useGameStore';
import { eventBus } from '@/engine/managers/EventBus';

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

describe('useGameStore EventBus emissions', () => {
  afterEach(() => {
    eventBus.all.clear();
  });

  it('emits room:entered with the correct payload on a normal entry', () => {
    const handler = vi.fn();
    eventBus.on('room:entered', handler);

    useGameStore.getState().enterRoom('api-gateway');

    expect(handler).toHaveBeenCalledWith({ roomId: 'api-gateway' });
    eventBus.off('room:entered', handler);
  });

  it('emits room:unlocked with the correct payload the first time a room is entered', () => {
    const handler = vi.fn();
    eventBus.on('room:unlocked', handler);

    useGameStore.getState().enterRoom('api-gateway');

    expect(handler).toHaveBeenCalledWith({ roomId: 'api-gateway' });
    eventBus.off('room:unlocked', handler);
  });

  it('does not emit room:unlocked again on re-entry into an already-visited room, but still emits room:entered', () => {
    useGameStore.getState().enterRoom('api-gateway');

    const enteredHandler = vi.fn();
    const unlockedHandler = vi.fn();
    eventBus.on('room:entered', enteredHandler);
    eventBus.on('room:unlocked', unlockedHandler);

    useGameStore.getState().enterRoom('api-gateway');

    expect(enteredHandler).toHaveBeenCalledWith({ roomId: 'api-gateway' });
    expect(unlockedHandler).not.toHaveBeenCalled();
    eventBus.off('room:entered', enteredHandler);
    eventBus.off('room:unlocked', unlockedHandler);
  });
});
