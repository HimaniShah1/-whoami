'use client';

import { useGameStore } from '@/engine/state/useGameStore';
import { getRoomById } from '@/engine/constants/rooms';

export default function Hud() {
  const requestId = useGameStore((state) => state.requestId);
  const protocol = useGameStore((state) => state.protocol);
  const ttl = useGameStore((state) => state.ttl);
  const latencyMs = useGameStore((state) => state.latencyMs);
  const status = useGameStore((state) => state.status);
  const currentRoomId = useGameStore((state) => state.currentRoomId);
  const room = getRoomById(currentRoomId);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 flex justify-between p-4 font-mono text-xs text-primary-muted">
      <div className="space-y-0.5">
        <div>REQUEST {requestId}</div>
        <div>{protocol}</div>
        <div>TTL {ttl}</div>
      </div>
      <div className="space-y-0.5 text-right">
        <div>{room.name.toUpperCase()}</div>
        <div>LATENCY {latencyMs}ms</div>
        <div>STATUS {status.toUpperCase()}</div>
      </div>
    </div>
  );
}
