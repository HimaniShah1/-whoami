import { RigidBody } from '@react-three/rapier';
import { colors } from '@/engine/constants/design-tokens';
import RoomShell from './shared/RoomShell';
import Terminal from './shared/Terminal';

const AUTH_SERVICE_LINES = [
  'cat auth-notes.md',
  '',
  'This is where "who are you" gets answered before "what are you',
  'allowed to do" even gets asked.',
  '',
  'Authentication confirms identity — a valid token, a signed session,',
  'a password that matched. Authorization is a separate question: now',
  'that we know who you are, what are you allowed to touch? Conflating',
  'the two is a classic security bug.',
  '',
  'A JWT is just a signed claim: "this user is who they say they are,',
  'as of this timestamp, according to someone we trust." No database',
  'round-trip needed to verify it — just check the signature.',
  '',
  'Once this request is authenticated, it\'s allowed past the gate and',
  'into the parts of the system that actually do the work.',
];

const PANEL_POSITIONS: { position: [number, number, number]; rotationY: number }[] = [
  { position: [-2.2, 1.5, -2.2], rotationY: Math.PI / 6 },
  { position: [2.2, 1.5, -2.2], rotationY: -Math.PI / 6 },
];

export default function AuthServiceRoom() {
  return (
    <RoomShell roomId="auth-service" showLabel={false}>
      {PANEL_POSITIONS.map(({ position, rotationY }, index) => (
        <RigidBody key={index} type="fixed" colliders="cuboid" position={position} rotation={[0, rotationY, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.2, 3, 2]} />
            <meshStandardMaterial color={colors.backgroundElevated} metalness={0.6} roughness={0.3} />
          </mesh>
        </RigidBody>
      ))}
      <Terminal
        id="auth-service-term"
        title="auth-notes.md"
        lines={AUTH_SERVICE_LINES}
        position={[0, 1.6, 0]}
      />
    </RoomShell>
  );
}
