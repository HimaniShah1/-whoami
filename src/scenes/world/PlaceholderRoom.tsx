import { RigidBody } from '@react-three/rapier';
import { colors } from '@/engine/constants/design-tokens';

export default function PlaceholderRoom() {
  return (
    <group>
      <ambientLight intensity={0.15} color={colors.primaryMuted} />
      <pointLight position={[0, 4, 0]} intensity={8} color={colors.primary} distance={20} />
      <fog attach="fog" args={[colors.fog, 5, 40]} />

      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -0.5, 0]} receiveShadow>
          <boxGeometry args={[20, 1, 20]} />
          <meshStandardMaterial color={colors.backgroundElevated} />
        </mesh>
      </RigidBody>

      <RigidBody type="fixed" colliders="cuboid" position={[0, 1, -5]}>
        <mesh castShadow>
          <boxGeometry args={[1.2, 3, 2.4]} />
          <meshStandardMaterial color="#1b2230" metalness={0.4} roughness={0.6} />
        </mesh>
      </RigidBody>
    </group>
  );
}
