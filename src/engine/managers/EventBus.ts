import mitt from 'mitt';
import type { RoomId } from '@/types/rooms';

export type AppEvents = {
  'room:entered': { roomId: RoomId };
  'room:unlocked': { roomId: RoomId };
  'terminal:command': { command: string };
  'packet:delivered': { fromRoomId: RoomId; toRoomId: RoomId };
};

export const eventBus = mitt<AppEvents>();
