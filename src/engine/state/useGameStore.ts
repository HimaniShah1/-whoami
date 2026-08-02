import { create } from 'zustand';
import type { RoomId } from '@/types/rooms';
import type { RequestProtocol, RequestStatus } from '@/types/game';
import { isRoomUnlocked } from '@/engine/constants/rooms';
import { eventBus } from '@/engine/managers/EventBus';

const TTL_DECREMENT_PER_HOP = 1;
const LATENCY_SPIKE_MIN_MS = 80;
const LATENCY_SPIKE_MAX_MS = 220;

interface GameState {
  requestId: string;
  protocol: RequestProtocol;
  ttl: number;
  latencyMs: number;
  status: RequestStatus;
  currentRoomId: RoomId;
  visitedRooms: Set<RoomId>;
  collectedEasterEggs: Set<string>;
  enterRoom: (roomId: RoomId) => void;
  isUnlocked: (roomId: RoomId) => boolean;
  collectEasterEgg: (id: string) => void;
  setLatency: (ms: number) => void;
}

function generateRequestId(): string {
  return `req_${Math.random().toString(36).slice(2, 10)}`;
}

function randomLatencySpike(): number {
  return Math.round(LATENCY_SPIKE_MIN_MS + Math.random() * (LATENCY_SPIKE_MAX_MS - LATENCY_SPIKE_MIN_MS));
}

export const useGameStore = create<GameState>((set, get) => ({
  requestId: generateRequestId(),
  protocol: 'HTTP/2',
  ttl: 64,
  latencyMs: 0,
  status: 'pending',
  currentRoomId: 'load-balancer',
  visitedRooms: new Set<RoomId>(['load-balancer']),
  collectedEasterEggs: new Set<string>(),
  enterRoom: (roomId) => {
    const { visitedRooms, ttl } = get();
    if (!isRoomUnlocked(roomId, visitedRooms)) return;
    const nextVisited = new Set(visitedRooms);
    const wasUnvisited = !nextVisited.has(roomId);
    nextVisited.add(roomId);
    set({
      currentRoomId: roomId,
      visitedRooms: nextVisited,
      ttl: Math.max(0, ttl - TTL_DECREMENT_PER_HOP),
      latencyMs: randomLatencySpike(),
    });
    eventBus.emit('room:entered', { roomId });
    if (wasUnvisited) {
      eventBus.emit('room:unlocked', { roomId });
    }
  },
  isUnlocked: (roomId) => isRoomUnlocked(roomId, get().visitedRooms),
  collectEasterEgg: (id) =>
    set((state) => ({
      collectedEasterEggs: new Set(state.collectedEasterEggs).add(id),
    })),
  setLatency: (ms) => set({ latencyMs: ms }),
}));
