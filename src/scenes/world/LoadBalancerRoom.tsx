import { RigidBody } from '@react-three/rapier';
import { colors } from '@/engine/constants/design-tokens';
import RoomShell from './shared/RoomShell';
import Terminal from './shared/Terminal';

const LOAD_BALANCER_LINES = [
  'cat lb-notes.md',
  '',
  "Every request starts here. The load balancer's only job is deciding",
  'which backend instance handles it — get this wrong and one server',
  'melts down while three others sit idle.',
  '',
  'Round robin is the simple default: rotate through instances in order.',
  'Fine when every instance is equally warm and every request costs',
  'about the same.',
  '',
  'Least-connections tracks in-flight requests per instance and routes',
  'to whichever is least busy right now — better when request cost',
  'varies.',
  '',
  'Health checks matter more than the algorithm: an instance that\'s "up"',
  "but slow to respond is worse than one that's honestly down. This one",
  'pings each backend on an interval and pulls anything that fails.',
  '',
  "This request — that's you — just got assigned to a healthy instance.",
  'Next stop: the API Gateway.',
];

const RACK_POSITIONS: [number, number, number][] = [
  [-3, 1, -3.5],
  [-1.5, 1, -4],
  [2.5, 1, -3.5],
];

export default function LoadBalancerRoom() {
  return (
    <RoomShell roomId="load-balancer" showLabel={false}>
      {RACK_POSITIONS.map((position, index) => (
        <RigidBody key={index} type="fixed" colliders="cuboid" position={position}>
          <mesh castShadow>
            <boxGeometry args={[1.2, 3, 2.4]} />
            <meshStandardMaterial color={colors.rackFrame} metalness={0.4} roughness={0.6} />
          </mesh>
        </RigidBody>
      ))}
      <Terminal
        id="load-balancer-term"
        title="lb-notes.md"
        lines={LOAD_BALANCER_LINES}
        position={[0, 1.6, 0]}
      />
    </RoomShell>
  );
}
