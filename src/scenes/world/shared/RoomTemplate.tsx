import { RigidBody } from '@react-three/rapier';
import { Html } from '@react-three/drei';
import type { RoomId } from '@/types/rooms';
import { getIncomingRoomId, getRoomById } from '@/engine/constants/rooms';
import { colors } from '@/engine/constants/design-tokens';
import Portal from './Portal';

interface RoomTemplateProps {
  roomId: RoomId;
}

export default function RoomTemplate({ roomId }: RoomTemplateProps) {
  const room = getRoomById(roomId);
  const forwardTargetId = room.connections[0]?.roomId ?? null;
  const backTargetId = getIncomingRoomId(roomId);

  return (
    <group>
      <ambientLight intensity={0.15} color={colors.primaryMuted} />
      <pointLight position={[0, 4, 0]} intensity={8} color={colors.primary} distance={20} />

      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -0.5, 0]} receiveShadow>
          <boxGeometry args={[20, 1, 20]} />
          <meshStandardMaterial color={colors.backgroundElevated} />
        </mesh>
      </RigidBody>

      <Html position={[0, 3, 0]} center>
        <div className="pointer-events-none whitespace-nowrap font-mono text-xs text-primary-muted">
          {room.name.toUpperCase()}
        </div>
      </Html>

      {forwardTargetId && <Portal targetRoomId={forwardTargetId} direction="forward" />}
      {backTargetId && <Portal targetRoomId={backTargetId} direction="back" />}
    </group>
  );
}
