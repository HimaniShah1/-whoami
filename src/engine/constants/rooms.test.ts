import { describe, expect, it } from 'vitest';
import { getRoomById, isRoomUnlocked, ROOM_REGISTRY } from './rooms';

describe('ROOM_REGISTRY', () => {
  it('has an entry for every RoomId used by getRoomById', () => {
    expect(ROOM_REGISTRY['load-balancer'].id).toBe('load-balancer');
    expect(ROOM_REGISTRY['contact-gateway'].id).toBe('contact-gateway');
  });
});

describe('getRoomById', () => {
  it('returns the matching room definition', () => {
    expect(getRoomById('api-gateway').name).toBe('API Gateway');
  });

  it('throws for an unregistered id', () => {
    // @ts-expect-error - intentionally invalid id to test the runtime guard
    expect(() => getRoomById('not-a-room')).toThrow('Unknown room id: not-a-room');
  });
});

describe('isRoomUnlocked', () => {
  it('is true for a room with no prerequisites', () => {
    expect(isRoomUnlocked('load-balancer', new Set())).toBe(true);
  });

  it('is false when prerequisites are not yet visited', () => {
    expect(isRoomUnlocked('api-gateway', new Set())).toBe(false);
  });

  it('is true once all prerequisites are visited', () => {
    expect(isRoomUnlocked('api-gateway', new Set(['load-balancer']))).toBe(true);
  });
});
