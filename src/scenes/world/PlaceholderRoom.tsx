import { RigidBody } from '@react-three/rapier';
import { colors } from '@/engine/constants/design-tokens';
import { getRoomById } from '@/engine/constants/rooms';
import Portal from './shared/Portal';

export default function PlaceholderRoom() {
  const forwardTargetId = getRoomById('load-balancer').connections[0]?.roomId;

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

      <RigidBody type="fixed" colliders="cuboid" position={[0, 1, -5]}>
        <mesh castShadow>
          <boxGeometry args={[1.2, 3, 2.4]} />
          <meshStandardMaterial color={colors.rackFrame} metalness={0.4} roughness={0.6} />
        </mesh>
      </RigidBody>

      {forwardTargetId && <Portal targetRoomId={forwardTargetId} direction="forward" />}
    </group>
  );
}
