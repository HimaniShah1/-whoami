'use client';

import { useEffect } from 'react';
import { RigidBody } from '@react-three/rapier';
import type { RoomId } from '@/types/rooms';
import { useGameStore } from '@/engine/state/useGameStore';
import { useProximity } from '@/engine/hooks/useProximity';
import { colors } from '@/engine/constants/design-tokens';
import { eventBus } from '@/engine/managers/EventBus';
import { EYE_HEIGHT } from '@/engine/constants/player';

const ROOM_FLOOR_HALF_SIZE = 10;
const PORTAL_Z_OFFSET = 8;
const PORTAL_TRIGGER_RADIUS = 1.5;
const SPAWN_INSET = 2;

type PortalDirection = 'forward' | 'back';

const PORTAL_LOCAL_POSITION: Record<PortalDirection, [number, number, number]> = {
  forward: [0, EYE_HEIGHT, -PORTAL_Z_OFFSET],
  back: [0, EYE_HEIGHT, PORTAL_Z_OFFSET],
};

const SPAWN_TRANSFORM: Record<PortalDirection, { position: [number, number, number]; yaw: number }> = {
  forward: { position: [0, EYE_HEIGHT, ROOM_FLOOR_HALF_SIZE - SPAWN_INSET], yaw: 0 },
  back: { position: [0, EYE_HEIGHT, -(ROOM_FLOOR_HALF_SIZE - SPAWN_INSET)], yaw: Math.PI },
};

interface PortalProps {
  targetRoomId: RoomId;
  direction: PortalDirection;
}

export default function Portal({ targetRoomId, direction }: PortalProps) {
  const unlocked = useGameStore((state) => state.isUnlocked(targetRoomId));
  const position = PORTAL_LOCAL_POSITION[direction];
  const inRange = useProximity(position, PORTAL_TRIGGER_RADIUS);

  useEffect(() => {
    if (!unlocked || !inRange) return;
    const spawn = SPAWN_TRANSFORM[direction];
    eventBus.emit('portal:trigger', {
      targetRoomId,
      spawnPosition: spawn.position,
      spawnFacingYaw: spawn.yaw,
    });
  }, [inRange, unlocked, targetRoomId, direction]);

  const color = unlocked ? colors.primary : colors.statusError;

  return (
    <group position={position}>
      <mesh>
        <torusGeometry args={[1.2, 0.08, 8, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={unlocked ? 0.6 : 0.2}
        />
      </mesh>
      {!unlocked && (
        <RigidBody type="fixed" colliders="cuboid">
          <mesh>
            <boxGeometry args={[2.4, 3, 0.3]} />
            <meshStandardMaterial color={color} transparent opacity={0.35} />
          </mesh>
        </RigidBody>
      )}
    </group>
  );
}
