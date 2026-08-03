import { RigidBody } from '@react-three/rapier';
import { colors } from '@/engine/constants/design-tokens';
import RoomShell from './shared/RoomShell';
import Terminal from './shared/Terminal';

const ABOUT_ME_LINES = [
  'cat about.md',
  '',
  'Himani Shah',
  'himanishah202@gmail.com',
  '',
  '[bio pending — the rest of this file is mine to write]',
];

export default function AboutMeRoom() {
  return (
    <RoomShell roomId="about-me" showLabel={false}>
      <RigidBody type="fixed" colliders="cuboid" position={[0, 0.5, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.6, 1, 0.6]} />
          <meshStandardMaterial color={colors.rackFrame} metalness={0.4} roughness={0.6} />
        </mesh>
      </RigidBody>
      <Terminal
        id="about-me-term"
        title="about.md"
        lines={ABOUT_ME_LINES}
        position={[0, 1.6, 0]}
      />
    </RoomShell>
  );
}
