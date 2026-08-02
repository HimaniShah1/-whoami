'use client';

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import type { RoomId } from '@/types/rooms';
import { useGameStore } from '@/engine/state/useGameStore';
import { useProximity } from '@/engine/hooks/useProximity';
import { colors } from '@/engine/constants/design-tokens';
import { eventBus } from '@/engine/managers/EventBus';
import { EYE_HEIGHT } from '@/engine/constants/player';

const PORTAL_Z_OFFSET = 8;
const PORTAL_TRIGGER_RADIUS = 1.5;
// Must stay greater than PORTAL_TRIGGER_RADIUS so a freshly spawned player
// never lands inside the destination room's return portal's trigger volume.
const SPAWN_PORTAL_CLEARANCE = 2;
const SPAWN_Z = PORTAL_Z_OFFSET - SPAWN_PORTAL_CLEARANCE;

type PortalDirection = 'forward' | 'back';

const PORTAL_LOCAL_POSITION: Record<PortalDirection, [number, number, number]> = {
  forward: [0, EYE_HEIGHT, -PORTAL_Z_OFFSET],
  back: [0, EYE_HEIGHT, PORTAL_Z_OFFSET],
};

const SPAWN_TRANSFORM: Record<PortalDirection, { position: [number, number, number]; yaw: number }> = {
  forward: { position: [0, EYE_HEIGHT, SPAWN_Z], yaw: 0 },
  back: { position: [0, EYE_HEIGHT, -SPAWN_Z], yaw: Math.PI },
};

interface PortalProps {
  targetRoomId: RoomId;
  direction: PortalDirection;
}

export default function Portal({ targetRoomId, direction }: PortalProps) {
  const unlocked = useGameStore((state) => state.isUnlocked(targetRoomId));
  const position = PORTAL_LOCAL_POSITION[direction];
  const inRange = useProximity(position, PORTAL_TRIGGER_RADIUS);

  // Defense in depth against a future geometry regression re-overlapping a
  // spawn point with a portal's trigger radius. `useProximity` always starts
  // a fresh instance at `inRange = false` and only reports a real measurement
  // after its own useFrame tick has run, so the very first render's `false`
  // is not trustworthy evidence the player is actually clear of the portal —
  // it's just the hook's default. `hasMeasuredFrame` tracks that at least one
  // real per-frame measurement has occurred; only once that's true do we
  // trust an observed `inRange === false` enough to arm the portal. This
  // guarantees a portal can never emit on the very first render where it
  // becomes aware of an in-range player — it must first have registered a
  // genuine (post-measurement) out-of-range render.
  const [hasMeasuredFrame, setHasMeasuredFrame] = useState(false);
  const hasBeenOutOfRangeRef = useRef(false);

  useFrame(() => {
    if (!hasMeasuredFrame) setHasMeasuredFrame(true);
  });

  useEffect(() => {
    if (!hasMeasuredFrame) return;
    if (!inRange) {
      hasBeenOutOfRangeRef.current = true;
      return;
    }
    if (!unlocked || !hasBeenOutOfRangeRef.current) return;
    const spawn = SPAWN_TRANSFORM[direction];
    eventBus.emit('portal:trigger', {
      targetRoomId,
      spawnPosition: spawn.position,
      spawnFacingYaw: spawn.yaw,
    });
  }, [inRange, unlocked, targetRoomId, direction, hasMeasuredFrame]);

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
