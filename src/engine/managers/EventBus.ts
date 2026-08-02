import mitt from 'mitt';
import type { RoomId } from '@/types/rooms';

export type AppEvents = {
  'room:entered': { roomId: RoomId };
  'room:unlocked': { roomId: RoomId };
  'terminal:command': { command: string };
  'terminal:trigger': { id: string; title: string; lines: string[] };
  'packet:delivered': { fromRoomId: RoomId; toRoomId: RoomId };
  'portal:trigger': {
    targetRoomId: RoomId;
    spawnPosition: [number, number, number];
    spawnFacingYaw: number;
  };
  'camera:reset': { position: [number, number, number]; facingYaw: number };
};

export const eventBus = mitt<AppEvents>();
